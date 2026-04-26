import type { PlanId } from "@prisma/client";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchEventToIntegrations } from "@/lib/tracking/integrations";
import { getPlanIdForStripePrice, getStripe } from "@/lib/stripe";
import { IngestEventSchema } from "@/lib/tracking/schemas";

export const runtime = "nodejs";

function readPlanFromSubscription(subscription: { items?: { data?: Array<{ price?: { id?: string | null } | null }> } }) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  return getPlanIdForStripePrice(priceId);
}

async function updatePlanByUserId(userId: string, plan: PlanId) {
  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  });
}

async function updatePlanByEmail(email: string, plan: PlanId) {
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { plan },
  });
}

function readTrackingFromMetadata(metadata: Record<string, string> | null | undefined) {
  return {
    session_id: metadata?.session_id || undefined,
    visitor_id: metadata?.visitor_id || undefined,
    anonymous_id: metadata?.anonymous_id || undefined,
    lead_id: metadata?.lead_id || metadata?.userId || undefined,
    user_id: metadata?.userId || undefined,
    funnel_id: metadata?.funnel_id || undefined,
    step_id: metadata?.step_id || undefined,
    utm_source: metadata?.utm_source || undefined,
    utm_medium: metadata?.utm_medium || undefined,
    utm_campaign: metadata?.utm_campaign || undefined,
    utm_content: metadata?.utm_content || undefined,
    utm_term: metadata?.utm_term || undefined,
    fbclid: metadata?.fbclid || undefined,
    gclid: metadata?.gclid || undefined,
    ttclid: metadata?.ttclid || undefined,
  };
}

async function persistTrackingEvent(raw: unknown) {
  const parsed = IngestEventSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[stripe/webhook][tracking] invalid payload", parsed.error.flatten());
    return;
  }
  const event = parsed.data;
  await prisma.event
    .create({
      data: {
        eventId: event.event_id,
        eventName: event.event_name,
        eventVersion: event.event_version,
        timestamp: new Date(event.timestamp),
        sessionId: event.session_id ?? null,
        visitorId: event.visitor_id ?? null,
        anonymousId: event.anonymous_id ?? null,
        leadId: event.lead_id ?? null,
        userId: event.user_id ?? null,
        orderId: event.order_id ?? null,
        funnelId: event.funnel_id ?? null,
        stepId: event.step_id ?? null,
        pageType: event.page_type ?? null,
        utmSource: event.utm_source ?? null,
        utmMedium: event.utm_medium ?? null,
        utmCampaign: event.utm_campaign ?? null,
        utmContent: event.utm_content ?? null,
        utmTerm: event.utm_term ?? null,
        fbclid: event.fbclid ?? null,
        gclid: event.gclid ?? null,
        ttclid: event.ttclid ?? null,
        ip: event.ip ?? null,
        country: event.country ?? null,
        device: event.device ?? null,
        browser: event.browser ?? null,
        os: event.os ?? null,
        referrer: event.referrer ?? null,
        revenue: event.revenue ?? null,
        currency: event.currency ?? null,
        schemaName: event.schema_name,
        schemaVersion: event.schema_version,
        metadataJson: event.metadata_json ?? {},
      },
    })
    .catch(() => undefined);
  await dispatchEventToIntegrations(event).catch(() => undefined);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanId | undefined;
        if (userId && plan) {
          await updatePlanByUserId(userId, plan);
        }

        // Converte subscrição "entrada" para schedule com mudança automática para mensal.
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;
        const monthlyPriceId = session.metadata?.monthlyPriceId;
        const trialDays = Number(session.metadata?.trialDays ?? "7");

        if (subscriptionId && monthlyPriceId) {
          const sub = (await stripe.subscriptions.retrieve(
            subscriptionId,
          )) as unknown as Stripe.Subscription;
          const startDate = Math.floor(Date.now() / 1000);
          const secondPhaseStart = startDate + Math.max(1, trialDays) * 24 * 60 * 60;

          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscriptionId,
          });
          await stripe.subscriptionSchedules.update(schedule.id, {
            end_behavior: "release",
            phases: [
              {
                start_date: startDate,
                end_date: secondPhaseStart,
                items: sub.items.data.map((item) => ({
                  price: item.price.id,
                  quantity: item.quantity ?? 1,
                })),
              },
              {
                start_date: secondPhaseStart,
                items: [{ price: monthlyPriceId, quantity: 1 }],
              },
            ],
          });
        }

        // Access signal after successful checkout completion.
        const tracking = readTrackingFromMetadata(session.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "app_access_created",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_checkout_completed",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${session.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: session.id,
          funnel_id: tracking.funnel_id,
          step_id: tracking.step_id,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          ttclid: tracking.ttclid,
          metadata_json: {
            stripe_event_id: event.id,
            stripe_checkout_session_id: session.id,
            source_type: "checkout.session.completed",
            payment_status: session.payment_status,
          },
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const plan = readPlanFromSubscription(subscription);
        if (!plan) break;

        const customerId = subscription.customer;
        if (typeof customerId !== "string") break;
        const customer = await stripe.customers.retrieve(customerId);
        const email = "email" in customer ? customer.email : null;
        if (!email) break;
        await updatePlanByEmail(email, plan);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        if (typeof customerId !== "string") break;
        const customer = await stripe.customers.retrieve(customerId);
        const email = "email" in customer ? customer.email : null;
        if (!email) break;
        await updatePlanByEmail(email, "FRONT");
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const tracking = readTrackingFromMetadata(pi.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "payment_success",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_payment_success",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${pi.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: pi.id,
          funnel_id: tracking.funnel_id ?? "quiz_gelatina",
          step_id: tracking.step_id,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          ttclid: tracking.ttclid,
          revenue: typeof pi.amount_received === "number" ? pi.amount_received / 100 : typeof pi.amount === "number" ? pi.amount / 100 : 0,
          currency: (pi.currency ?? "eur").toUpperCase(),
          metadata_json: {
            stripe_event_id: event.id,
            stripe_payment_intent_id: pi.id,
          },
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const tracking = readTrackingFromMetadata(pi.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "payment_failed",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_payment_failed",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${pi.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: pi.id,
          funnel_id: tracking.funnel_id ?? "quiz_gelatina",
          step_id: tracking.step_id,
          metadata_json: {
            stripe_event_id: event.id,
            stripe_payment_intent_id: pi.id,
            failure_message: pi.last_payment_error?.message,
            failure_code: pi.last_payment_error?.code,
          },
        });
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object;
        const tracking = readTrackingFromMetadata(invoice.parent?.subscription_details?.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "payment_success",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_invoice_paid",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${invoice.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: invoice.payment_intent ? String(invoice.payment_intent) : invoice.id,
          funnel_id: tracking.funnel_id,
          step_id: tracking.step_id,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_content: tracking.utm_content,
          utm_term: tracking.utm_term,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          ttclid: tracking.ttclid,
          revenue: typeof invoice.amount_paid === "number" ? invoice.amount_paid / 100 : 0,
          currency: (invoice.currency ?? "eur").toUpperCase(),
          metadata_json: {
            stripe_event_id: event.id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: typeof invoice.subscription === "string" ? invoice.subscription : undefined,
            source_type: "invoice.paid",
          },
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const tracking = readTrackingFromMetadata(invoice.parent?.subscription_details?.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "payment_failed",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_invoice_payment_failed",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${invoice.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: invoice.payment_intent ? String(invoice.payment_intent) : invoice.id,
          funnel_id: tracking.funnel_id,
          step_id: tracking.step_id,
          metadata_json: {
            stripe_event_id: event.id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: typeof invoice.subscription === "string" ? invoice.subscription : undefined,
            source_type: "invoice.payment_failed",
          },
        });
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const tracking = readTrackingFromMetadata(charge.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "refund",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_refund",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${charge.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: charge.payment_intent ? String(charge.payment_intent) : charge.id,
          funnel_id: tracking.funnel_id ?? "quiz_gelatina",
          revenue: typeof charge.amount_refunded === "number" ? charge.amount_refunded / 100 : 0,
          currency: (charge.currency ?? "eur").toUpperCase(),
          metadata_json: {
            stripe_event_id: event.id,
            charge_id: charge.id,
            reason: charge.refunded ? "refunded" : "partial_refund",
          },
        });
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object;
        const tracking = readTrackingFromMetadata(dispute.metadata);
        await persistTrackingEvent({
          event_id: `stripe:${event.id}`,
          event_name: "chargeback",
          event_version: 1,
          timestamp: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
          schema_name: "stripe_chargeback",
          schema_version: 1,
          session_id: tracking.session_id ?? `stripe_${dispute.id}`,
          visitor_id: tracking.visitor_id,
          anonymous_id: tracking.anonymous_id,
          lead_id: tracking.lead_id,
          user_id: tracking.user_id,
          order_id: dispute.payment_intent ? String(dispute.payment_intent) : dispute.id,
          funnel_id: tracking.funnel_id ?? "quiz_gelatina",
          revenue: typeof dispute.amount === "number" ? dispute.amount / 100 : 0,
          currency: (dispute.currency ?? "eur").toUpperCase(),
          metadata_json: {
            stripe_event_id: event.id,
            dispute_id: dispute.id,
            reason: dispute.reason,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

