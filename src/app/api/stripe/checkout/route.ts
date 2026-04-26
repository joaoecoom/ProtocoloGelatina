import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planUpdateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { PLAN_CATALOG } from "@/lib/plans";
import { IngestEventSchema } from "@/lib/tracking/schemas";
import { getStripe, getStripePriceIdForPlan } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const tracking = (json as { tracking?: Record<string, string | undefined> } | null)?.tracking;
  const parsed = planUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const plan = parsed.data.plan;
  const priceId = getStripePriceIdForPlan(plan);
  const planMeta = PLAN_CATALOG[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `Plano sem price configurado: ${plan}. Define STRIPE_PRICE_${plan}.` },
      { status: 400 },
    );
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const originFromRequest = host ? `${proto}://${host}` : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? originFromRequest ?? "http://localhost:3000";
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Cobra só a entrada agora (item one-time) e inicia subscrição mensal após o trial.
    line_items: [
      { price: priceId, quantity: 1 },
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${planMeta.label} · Entrada ${planMeta.trialDays} dias`,
          },
          unit_amount: Math.round(planMeta.trialEuro * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/planos?checkout=success`,
    cancel_url: `${appUrl}/planos?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    subscription_data: {
      trial_period_days: Math.max(1, planMeta.trialDays),
      metadata: {
        userId: user.id,
        plan,
        billingModel: "intro_once_then_monthly",
        session_id: tracking?.session_id ?? "",
        visitor_id: tracking?.visitor_id ?? "",
        anonymous_id: tracking?.anonymous_id ?? "",
        funnel_id: tracking?.funnel_id ?? "app_checkout",
        step_id: tracking?.step_id ?? "",
        utm_source: tracking?.utm_source ?? "",
        utm_medium: tracking?.utm_medium ?? "",
        utm_campaign: tracking?.utm_campaign ?? "",
        utm_content: tracking?.utm_content ?? "",
        utm_term: tracking?.utm_term ?? "",
        fbclid: tracking?.fbclid ?? "",
        gclid: tracking?.gclid ?? "",
        ttclid: tracking?.ttclid ?? "",
      },
    },
    metadata: {
      userId: user.id,
      plan,
      session_id: tracking?.session_id ?? "",
      visitor_id: tracking?.visitor_id ?? "",
      anonymous_id: tracking?.anonymous_id ?? "",
      funnel_id: tracking?.funnel_id ?? "app_checkout",
      step_id: tracking?.step_id ?? "",
      utm_source: tracking?.utm_source ?? "",
      utm_medium: tracking?.utm_medium ?? "",
      utm_campaign: tracking?.utm_campaign ?? "",
      utm_content: tracking?.utm_content ?? "",
      utm_term: tracking?.utm_term ?? "",
      fbclid: tracking?.fbclid ?? "",
      gclid: tracking?.gclid ?? "",
      ttclid: tracking?.ttclid ?? "",
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Não foi possível criar checkout." }, { status: 500 });
  }

  const eventPayload = IngestEventSchema.safeParse({
    event_id: `evt_checkout_session_created_${session.id}`,
    event_name: "checkout_session_created",
    event_version: 1,
    timestamp: new Date().toISOString(),
    schema_name: "checkout_session_created",
    schema_version: 1,
    session_id: tracking?.session_id,
    visitor_id: tracking?.visitor_id,
    anonymous_id: tracking?.anonymous_id,
    lead_id: user.id,
    user_id: user.id,
    funnel_id: tracking?.funnel_id ?? "app_checkout",
    step_id: tracking?.step_id,
    page_type: "checkout",
    utm_source: tracking?.utm_source,
    utm_medium: tracking?.utm_medium,
    utm_campaign: tracking?.utm_campaign,
    utm_content: tracking?.utm_content,
    utm_term: tracking?.utm_term,
    fbclid: tracking?.fbclid,
    gclid: tracking?.gclid,
    ttclid: tracking?.ttclid,
    metadata_json: {
      stripe_checkout_session_id: session.id,
      offer_id: plan,
      plan_id: plan,
      source: "app_checkout",
    },
  });

  if (eventPayload.success) {
    await prisma.event.create({
      data: {
        eventId: eventPayload.data.event_id,
        eventName: eventPayload.data.event_name,
        eventVersion: eventPayload.data.event_version,
        timestamp: new Date(eventPayload.data.timestamp),
        sessionId: eventPayload.data.session_id ?? null,
        visitorId: eventPayload.data.visitor_id ?? null,
        anonymousId: eventPayload.data.anonymous_id ?? null,
        leadId: eventPayload.data.lead_id ?? null,
        userId: eventPayload.data.user_id ?? null,
        orderId: eventPayload.data.order_id ?? null,
        funnelId: eventPayload.data.funnel_id ?? null,
        stepId: eventPayload.data.step_id ?? null,
        pageType: eventPayload.data.page_type ?? null,
        utmSource: eventPayload.data.utm_source ?? null,
        utmMedium: eventPayload.data.utm_medium ?? null,
        utmCampaign: eventPayload.data.utm_campaign ?? null,
        utmContent: eventPayload.data.utm_content ?? null,
        utmTerm: eventPayload.data.utm_term ?? null,
        fbclid: eventPayload.data.fbclid ?? null,
        gclid: eventPayload.data.gclid ?? null,
        ttclid: eventPayload.data.ttclid ?? null,
        schemaName: eventPayload.data.schema_name,
        schemaVersion: eventPayload.data.schema_version,
        metadataJson: eventPayload.data.metadata_json ?? {},
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ url: session.url });
}

