import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { planUpdateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { PLAN_CATALOG } from "@/lib/plans";
import { getStripe, getStripeIntroPriceIdForPlan, getStripePriceIdForPlan } from "@/lib/stripe";

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
  const introPriceId = getStripeIntroPriceIdForPlan(plan);
  const planMeta = PLAN_CATALOG[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `Plano sem price configurado: ${plan}. Define STRIPE_PRICE_${plan}.` },
      { status: 400 },
    );
  }
  if (!introPriceId) {
    return NextResponse.json(
      { error: `Plano sem price de entrada: ${plan}. Define STRIPE_PRICE_${plan}_INTRO.` },
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
    // 1ª fase: preço de entrada (ex.: 6.99€ / 7 dias)
    line_items: [{ price: introPriceId, quantity: 1 }],
    success_url: `${appUrl}/planos?checkout=success`,
    cancel_url: `${appUrl}/planos?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
        monthlyPriceId: priceId,
        trialDays: String(planMeta.trialDays),
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

