import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PLAN_CATALOG } from "@/lib/plans";
import { getStripe, resolveCheckoutHandlerError, resolveStripeMonthlyPriceIdWithStripe } from "@/lib/stripe";
import { planUpdateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
  }

  const emailRaw = (json as { email?: string } | null)?.email ?? "";
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Email de compra invalido para cobrar a oferta." }, { status: 400 });
  }

  const tracking = (json as { tracking?: Record<string, string | undefined> } | null)?.tracking;
  const plan = parsed.data.plan;
  const planMeta = PLAN_CATALOG[plan];

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json({ error: "Pagamentos indisponiveis: STRIPE_SECRET_KEY em falta." }, { status: 503 });
  }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (host ? `${proto}://${host}` : null) ??
    "http://localhost:3000";

  try {
    const stripe = getStripe();
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0];
    if (!customer) {
      return NextResponse.json({ error: "Nao encontramos cliente Stripe para este email." }, { status: 404 });
    }

    const monthlyPriceId = await resolveStripeMonthlyPriceIdWithStripe(stripe, plan);
    if (!monthlyPriceId) {
      return NextResponse.json({ error: `Nao ha preco mensal para ${plan}.` }, { status: 400 });
    }

    const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
    const baseProductId =
      typeof monthlyPrice.product === "string" ? monthlyPrice.product : monthlyPrice.product?.id;
    if (!baseProductId) {
      return NextResponse.json({ error: "Nao foi possivel resolver o produto base desta oferta." }, { status: 400 });
    }

    const customerDefaultPaymentMethod =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    const fallbackSubscription = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    const subWithPm = fallbackSubscription.data.find((s) => typeof s.default_payment_method === "string");
    const defaultPaymentMethod = customerDefaultPaymentMethod ?? (subWithPm?.default_payment_method as string | null);
    if (!defaultPaymentMethod) {
      return NextResponse.json(
        { error: "Nao existe metodo de pagamento guardado para cobranca automatica." },
        { status: 400 },
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: monthlyPriceId, quantity: 1 }],
      default_payment_method: defaultPaymentMethod,
      trial_period_days: Math.max(1, planMeta.trialDays),
      add_invoice_items: [
        {
          price_data: {
            currency: "eur",
            product: baseProductId,
            unit_amount: Math.round(planMeta.trialEuro * 100),
            tax_behavior: "exclusive",
          },
          quantity: 1,
        },
      ],
      payment_behavior: "error_if_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        plan,
        source: "quiz_offer_one_click",
        monthlyPriceId,
        trialDays: String(planMeta.trialDays),
        appUrl,
        session_id: tracking?.session_id ?? "",
        visitor_id: tracking?.visitor_id ?? "",
        anonymous_id: tracking?.anonymous_id ?? "",
        funnel_id: tracking?.funnel_id ?? "quiz_gelatina",
        step_id: tracking?.step_id ?? "",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      customerId: customer.id,
    });
  } catch (err) {
    console.error("[offer-charge] create", err);
    const { status, error } = resolveCheckoutHandlerError(err);
    return NextResponse.json({ error }, { status });
  }
}
