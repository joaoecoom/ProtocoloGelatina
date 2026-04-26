import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { PLAN_CATALOG } from "@/lib/plans";
import { getStripe, getStripePriceIdForPlan } from "@/lib/stripe";
import { planUpdateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
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
    success_url: `${appUrl}/quiz?checkout=success`,
    cancel_url: `${appUrl}/quiz?checkout=cancel`,
    subscription_data: {
      metadata: {
        plan,
        billingModel: "intro_once_then_monthly",
        source: "quiz_guest",
      },
    },
    metadata: {
      plan,
      source: "quiz_guest",
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Nao foi possivel criar checkout." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}

