import type Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PLAN_CATALOG } from "@/lib/plans";
import {
  getStripe,
  resolveCheckoutHandlerError,
  resolveStripeMonthlyPriceIdWithStripe,
} from "@/lib/stripe";
import { shouldStripeQuizCheckoutDevMock } from "@/lib/stripe-dev-mock";
import { planUpdateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const tracking = (json as { tracking?: Record<string, string | undefined> } | null)?.tracking;
  const parsed = planUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
  }

  const plan = parsed.data.plan;
  const planMeta = PLAN_CATALOG[plan];

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const originFromRequest = host ? `${proto}://${host}` : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? originFromRequest ?? "http://localhost:3000";

  if (shouldStripeQuizCheckoutDevMock()) {
    return NextResponse.json({ url: `${appUrl}/quiz?checkout=dev-mock`, dev_mock: true });
  }
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { error: "Pagamentos indisponiveis: STRIPE_SECRET_KEY em falta no servidor." },
      { status: 503 },
    );
  }

  let session: Stripe.Checkout.Session;
  try {
    const stripe = getStripe();
    const priceId = await resolveStripeMonthlyPriceIdWithStripe(stripe, plan);
    if (!priceId) {
      return NextResponse.json({ error: `Nao ha preco mensal para ${plan}.` }, { status: 400 });
    }
    const sessionParams = {
      ui_mode: "embedded_page",
      mode: "subscription",
      return_url: `${appUrl}/quiz?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Protocolo Gelatina Inteligente",
            },
            unit_amount: Math.round(planMeta.trialEuro * 100),
            tax_behavior: "exclusive",
          },
          quantity: 1,
        },
        { price: priceId, quantity: 1 },
      ],
      subscription_data: {
        trial_period_days: Math.max(1, planMeta.trialDays),
        metadata: {
          plan,
          billingModel: "intro_once_then_monthly",
          source: "quiz_guest_embedded",
          session_id: tracking?.session_id ?? "",
          visitor_id: tracking?.visitor_id ?? "",
          anonymous_id: tracking?.anonymous_id ?? "",
          funnel_id: tracking?.funnel_id ?? "quiz_gelatina",
          step_id: tracking?.step_id ?? "final-sales",
        },
      },
      metadata: {
        plan,
        monthlyPriceId: priceId,
        trialDays: String(planMeta.trialDays),
        source: "quiz_guest_embedded",
        session_id: tracking?.session_id ?? "",
        visitor_id: tracking?.visitor_id ?? "",
        anonymous_id: tracking?.anonymous_id ?? "",
        funnel_id: tracking?.funnel_id ?? "quiz_gelatina",
        step_id: tracking?.step_id ?? "final-sales",
      },
    };
    session = await stripe.checkout.sessions.create(sessionParams as never);
  } catch (err) {
    console.error("[checkout-guest-embedded] checkout", err);
    const { status, error } = resolveCheckoutHandlerError(err);
    return NextResponse.json({ error }, { status });
  }

  if (!session.client_secret) {
    return NextResponse.json({ error: "Sessao de checkout sem client_secret." }, { status: 500 });
  }
  return NextResponse.json({ clientSecret: session.client_secret });
}
