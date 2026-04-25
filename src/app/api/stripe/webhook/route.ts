import type { PlanId } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanIdForStripePrice, getStripe } from "@/lib/stripe";

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
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

