import type { PlanId } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchEventToIntegrations } from "@/lib/tracking/integrations";
import { getPlanIdForStripePriceId, getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { IngestEventSchema } from "@/lib/tracking/schemas";

export const runtime = "nodejs";

function resolveAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const withProto = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return "http://localhost:3000";
  }
}

async function sendPostPurchaseAccessEmail(params: { email: string; defaultPassword: string; appBaseUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.PURCHASE_ACCESS_FROM_EMAIL?.trim();
  if (!apiKey || !from) return false;

  const loginUrl = `${params.appBaseUrl}/entrar/checkout?email=${encodeURIComponent(params.email)}`;
  const resetUrl = `${params.appBaseUrl}/esqueci-password`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>Acesso ao Protocolo Gelatina Inteligente</h2>
      <p>A tua compra foi confirmada. Aqui estão os teus dados de acesso:</p>
      <ul>
        <li><strong>Link da app:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
        <li><strong>Email de compra:</strong> ${params.email}</li>
        <li><strong>Password inicial:</strong> ${params.defaultPassword}</li>
      </ul>
      <p>Se quiseres alterar a password, usa este link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Qualquer dúvida, responde a este email.</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [params.email],
      subject: "Acesso confirmado: Protocolo Gelatina Inteligente",
      html,
    }),
  });

  return response.ok;
}

async function readPlanFromSubscription(
  stripe: Stripe,
  subscription: { items?: { data?: Array<{ price?: { id?: string | null } | null }> } },
) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) return null;
  return getPlanIdForStripePriceId(stripe, priceId);
}

async function updatePlanByUserId(userId: string, plan: PlanId) {
  await prisma.user.update({
    where: { id: userId },
    data: { plan },
  });
}

async function updatePlanByEmail(email: string, plan: PlanId) {
  await prisma.user
    .update({
      where: { email: email.toLowerCase() },
      data: { plan },
    })
    .catch(() => undefined);
}

function isPlanId(value: string | undefined | null): value is PlanId {
  return (
    value === "FRONT" ||
    value === "UPSELL_1" ||
    value === "DS1_UP1" ||
    value === "DS2_UP1" ||
    value === "DS3_UP1" ||
    value === "UPSELL_2" ||
    value === "DS1_UP2" ||
    value === "DS2_UP2" ||
    value === "DS3_UP2"
  );
}

async function ensurePurchaseAccess(params: {
  email: string | null | undefined;
  plan?: PlanId | null;
  sendAccessEmail?: boolean;
}) {
  const rawEmail = params.email?.trim().toLowerCase();
  if (!rawEmail || !rawEmail.includes("@")) return;

  const defaultPassword = process.env.PURCHASE_DEFAULT_PASSWORD?.trim() || "123456";
  const displayName = rawEmail.split("@")[0] || "Cliente";
  const appBaseUrl = resolveAppBaseUrl();

  let authUserId: string | null = null;

  try {
    const supabaseAdmin = createServiceRoleClient();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: rawEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        source: "stripe_purchase_auto_access",
      },
    });

    if (!error && data.user?.id) {
      authUserId = data.user.id;
    } else if (error && !/already|registered|exists/i.test(error.message)) {
      console.warn("[stripe/webhook] createUser failed", error.message);
    }
  } catch (error) {
    console.warn("[stripe/webhook] supabase admin unavailable", error);
  }

  if (!authUserId) {
    const existing = await prisma.user
      .findUnique({ where: { email: rawEmail }, select: { id: true } })
      .catch(() => null);
    authUserId = existing?.id ?? null;
  }

  if (authUserId) {
    await prisma.user
      .upsert({
        where: { id: authUserId },
        create: {
          id: authUserId,
          email: rawEmail,
          name: displayName,
          ...(params.plan ? { plan: params.plan } : {}),
        },
        update: {
          email: rawEmail,
          ...(params.plan ? { plan: params.plan } : {}),
        },
      })
      .catch(() => undefined);

    if (params.sendAccessEmail) {
      const emailSent = await sendPostPurchaseAccessEmail({
        email: rawEmail,
        defaultPassword,
        appBaseUrl,
      }).catch(() => false);
      if (!emailSent) {
        console.warn("[stripe/webhook] purchase access email not sent (missing provider config?)");
      }
    }
    return;
  }

  if (params.plan) {
    await updatePlanByEmail(rawEmail, params.plan);
  }
}

async function resolveEmailFromPaymentIntent(stripe: Stripe, pi: Stripe.PaymentIntent) {
  const billingEmail = pi.receipt_email || null;
  if (billingEmail && billingEmail.includes("@")) return billingEmail;
  if (typeof pi.customer !== "string") return null;
  const customer = await stripe.customers.retrieve(pi.customer);
  return "email" in customer ? customer.email : null;
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
        metadataJson: (event.metadata_json ?? {}) as Prisma.InputJsonValue,
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
        await ensurePurchaseAccess({
          email: session.customer_details?.email,
          plan: plan ?? null,
          sendAccessEmail: true,
        });

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
        const plan = await readPlanFromSubscription(stripe, subscription);
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
        const planFromMetadata = isPlanId(pi.metadata?.plan) ? pi.metadata.plan : null;
        const paidEmail = await resolveEmailFromPaymentIntent(stripe, pi);
        await ensurePurchaseAccess({ email: paidEmail, plan: planFromMetadata });
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
            access_email: paidEmail,
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
        // Evita duplicar purchase no funil: pagamentos com PaymentIntent já
        // chegam no webhook payment_intent.succeeded.
        if (invoice.payment_intent) {
          break;
        }
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
          order_id: invoice.id,
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
          order_id: invoice.id,
          funnel_id: tracking.funnel_id,
          step_id: tracking.step_id,
          metadata_json: {
            stripe_event_id: event.id,
            stripe_invoice_id: invoice.id,
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

