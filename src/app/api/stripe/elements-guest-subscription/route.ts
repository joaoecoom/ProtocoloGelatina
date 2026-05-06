import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PLAN_CATALOG } from "@/lib/plans";
import { getStripe, resolveCheckoutHandlerError, resolveStripeMonthlyPriceIdWithStripe } from "@/lib/stripe";
import { planUpdateSchema } from "@/lib/validators";

type FrontOfferId = "1w" | "4w" | "12w";

const FRONT_OFFER_PRICING: Record<FrontOfferId, { trialEuro: number }> = {
  "1w": { trialEuro: 6.99 },
  "4w": { trialEuro: 12.99 },
  "12w": { trialEuro: 22.49 },
};

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(json);
  const tracking = (json as { tracking?: Record<string, string | undefined> } | null)?.tracking;
  const emailRaw = (json as { email?: string } | null)?.email ?? "";
  const email = emailRaw.trim().toLowerCase();
  const couponCodeRaw = (json as { couponCode?: string } | null)?.couponCode ?? "";
  const couponCode = couponCodeRaw.trim().toLowerCase();
  if (!parsed.success) return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
  const hasValidEmail = email.includes("@");
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { error: "Pagamentos indisponiveis: STRIPE_SECRET_KEY em falta no servidor." },
      { status: 503 },
    );
  }

  const plan = parsed.data.plan;
  const offer = ((json as { offer?: string } | null)?.offer ?? "1w") as FrontOfferId;
  const frontOfferPricing = FRONT_OFFER_PRICING[offer] ?? FRONT_OFFER_PRICING["1w"];
  const testCouponEnabledRaw = process.env.CHECKOUT_TEST_COUPON_ENABLED?.trim().toLowerCase();
  const testCouponEnabled =
    testCouponEnabledRaw == null || testCouponEnabledRaw === ""
      ? true
      : ["1", "true", "yes", "on"].includes(testCouponEnabledRaw);
  const expectedTestCoupon = (process.env.CHECKOUT_TEST_COUPON_CODE ?? "cupomecoom").trim().toLowerCase();
  const isTestCouponApplied =
    testCouponEnabled && plan === "FRONT" && couponCode.length > 0 && couponCode === expectedTestCoupon;
  const planMeta = PLAN_CATALOG[plan];
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (host ? `${proto}://${host}` : null) ??
    "http://localhost:3000";

  try {
    const stripe = getStripe();
    const monthlyPriceId = await resolveStripeMonthlyPriceIdWithStripe(stripe, plan);
    if (!monthlyPriceId) {
      return NextResponse.json({ error: `Nao ha preco mensal para ${plan}.` }, { status: 400 });
    }
    const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
    const baseProductId =
      typeof monthlyPrice.product === "string" ? monthlyPrice.product : monthlyPrice.product?.id;
    if (!baseProductId) {
      return NextResponse.json({ error: "Nao foi possivel resolver produto base do plano." }, { status: 400 });
    }

    const existing = hasValidEmail ? await stripe.customers.list({ email, limit: 1 }) : null;
    const customerId =
      existing?.data[0]?.id ??
      (
        await stripe.customers.create({
          ...(hasValidEmail ? { email } : {}),
          metadata: {
            plan,
            source: "quiz_elements",
            session_id: tracking?.session_id ?? "",
            visitor_id: tracking?.visitor_id ?? "",
            anonymous_id: tracking?.anonymous_id ?? "",
          },
        })
      ).id;

    const upfrontTrialEuro =
      plan === "FRONT" ? (isTestCouponApplied ? 0 : frontOfferPricing.trialEuro) : planMeta.trialEuro;

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: monthlyPriceId, quantity: 1 }],
      trial_period_days: Math.max(1, planMeta.trialDays),
      add_invoice_items: [
        {
          price_data: {
            currency: "eur",
            product: baseProductId,
            unit_amount: Math.round(upfrontTrialEuro * 100),
            tax_behavior: "exclusive",
          },
          quantity: 1,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        plan,
        source: "quiz_guest_elements",
        monthlyPriceId,
        trialDays: String(planMeta.trialDays),
        front_offer: plan === "FRONT" ? offer : "",
        appUrl,
        session_id: tracking?.session_id ?? "",
        visitor_id: tracking?.visitor_id ?? "",
        anonymous_id: tracking?.anonymous_id ?? "",
        funnel_id: tracking?.funnel_id ?? "quiz_gelatina",
        step_id: tracking?.step_id ?? "final-sales",
      },
      expand: ["latest_invoice", "latest_invoice.payment_intent", "latest_invoice.confirmation_secret"],
    });

    const latestInvoice = subscription.latest_invoice as unknown;
    let clientSecret: string | null = null;
    if (latestInvoice && typeof latestInvoice === "object") {
      const invoiceAny = latestInvoice as {
        payment_intent?: string | { client_secret?: string | null } | null;
        confirmation_secret?: { client_secret?: string | null } | null;
      };
      const pi = invoiceAny.payment_intent;
      if (pi && typeof pi !== "string") {
        clientSecret = pi.client_secret ?? null;
      }
      if (pi && typeof pi === "string") {
        const paymentIntent = await stripe.paymentIntents.retrieve(pi);
        clientSecret = paymentIntent.client_secret ?? null;
      }
      if (!clientSecret) {
        clientSecret = invoiceAny.confirmation_secret?.client_secret ?? null;
      }
    }
    if (!clientSecret) {
      if (isTestCouponApplied) {
        return NextResponse.json({
          freeCheckout: true,
          couponApplied: true,
          subscriptionId: subscription.id,
          customerId,
        });
      }
      return NextResponse.json({ error: "Nao foi possivel obter client secret." }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      customerId,
      couponApplied: isTestCouponApplied,
    });
  } catch (err) {
    console.error("[elements-guest-subscription] create", err);
    const { status, error } = resolveCheckoutHandlerError(err);
    return NextResponse.json({ error }, { status });
  }
}
