import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { planUpdateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { PLAN_CATALOG } from "@/lib/plans";
import { getStripe, getStripePriceIdForPlan } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
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
      },
    },
    metadata: {
      userId: user.id,
      plan,
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Não foi possível criar checkout." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

