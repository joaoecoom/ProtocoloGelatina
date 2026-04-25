import Stripe from "stripe";
import type { PlanId } from "@prisma/client";

let stripeClient: Stripe | null = null;

const PLAN_IDS: PlanId[] = [
  "FRONT",
  "UPSELL_1",
  "DS1_UP1",
  "DS2_UP1",
  "DS3_UP1",
  "UPSELL_2",
  "DS1_UP2",
  "DS2_UP2",
  "DS3_UP2",
];

function envForPlan(plan: PlanId) {
  return `STRIPE_PRICE_${plan}`;
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return stripeClient;
}

export function getStripePriceIdForPlan(plan: PlanId) {
  const value = process.env[envForPlan(plan)];
  if (!value) return null;
  return value;
}

export function getConfiguredStripePlanMap() {
  const map: Partial<Record<PlanId, string>> = {};
  for (const plan of PLAN_IDS) {
    const priceId = getStripePriceIdForPlan(plan);
    if (priceId) map[plan] = priceId;
  }
  return map;
}

export function getPlanIdForStripePrice(priceId: string): PlanId | null {
  for (const plan of PLAN_IDS) {
    if (process.env[envForPlan(plan)] === priceId) return plan;
  }
  return null;
}

