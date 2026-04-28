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

function envForIntroPlan(plan: PlanId) {
  return `STRIPE_PRICE_${plan}_INTRO`;
}

/** Igual ao usado em `npm run stripe:seed` — permite resolver o price sem variável de ambiente. */
export function stripeCatalogMonthlyLookupKey(plan: PlanId) {
  return `pgi_plan_${plan}_monthly_eur`;
}

export function planIdFromCatalogMonthlyLookupKey(
  lookupKey: string | null | undefined,
): PlanId | null {
  if (!lookupKey?.startsWith("pgi_plan_") || !lookupKey.endsWith("_monthly_eur")) return null;
  const id = lookupKey.slice("pgi_plan_".length, -"_monthly_eur".length);
  return (PLAN_IDS as readonly string[]).includes(id) ? (id as PlanId) : null;
}

/**
 * STRIPE_PRICE_<PLAN> na env, ou preço do catálogo no Stripe (lookup_key do seed,
 * ou product com metadata gelatina_plan_id).
 */
export async function resolveStripeMonthlyPriceIdWithStripe(
  stripe: Stripe,
  plan: PlanId,
): Promise<string | null> {
  const fromEnv = getStripePriceIdForPlan(plan);
  if (fromEnv) return fromEnv;

  const lk = stripeCatalogMonthlyLookupKey(plan);
  const listed = await stripe.prices.list({
    lookup_keys: [lk],
    limit: 10,
  });
  const fromLookup =
    listed.data.find((p) => p.active) ?? listed.data.find((p) => p.lookup_key === lk) ?? listed.data[0];
  if (fromLookup?.id) return fromLookup.id;

  try {
    const searched = await stripe.products.search({
      query: `active:'true' AND metadata['gelatina_plan_id']:'${plan}'`,
      limit: 10,
    });
    for (const product of searched.data) {
      const prices = await stripe.prices.list({
        product: product.id,
        type: "recurring",
        limit: 20,
      });
      const month = prices.data.find((p) => p.active && p.recurring?.interval === "month");
      if (month) return month.id;
    }
  } catch (e) {
    console.warn("[resolveStripeMonthlyPriceId] products.search fallback", plan, e);
  }

  return null;
}

export async function resolveStripeMonthlyPriceId(plan: PlanId): Promise<string | null> {
  return resolveStripeMonthlyPriceIdWithStripe(getStripe(), plan);
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

/** Mapeia erros do Stripe (ou config) para resposta JSON estável do route handler. */
export function resolveCheckoutHandlerError(err: unknown): {
  status: number;
  error: string;
} {
  if (err instanceof Error && err.message === "Missing STRIPE_SECRET_KEY") {
    return {
      status: 503,
      error:
        "Pagamentos indisponiveis: STRIPE_SECRET_KEY nao configurada no servidor.",
    };
  }

  const type =
    typeof err === "object" && err !== null && "type" in err
      ? String((err as { type: unknown }).type)
      : null;
  const rawMessage =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : err instanceof Error
        ? err.message
        : "Erro ao criar sessao de pagamento.";

  if (type === "StripeInvalidRequestError") {
    return { status: 400, error: rawMessage };
  }
  if (type === "StripeAuthenticationError") {
    return { status: 503, error: "Chave Stripe invalida ou revogada." };
  }

  return { status: 500, error: rawMessage };
}

export function getStripePriceIdForPlan(plan: PlanId) {
  const value = process.env[envForPlan(plan)]?.trim();
  if (!value) return null;
  return value;
}

export function getStripeIntroPriceIdForPlan(plan: PlanId) {
  const value = process.env[envForIntroPlan(plan)]?.trim();
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

/** Quando o price veio só do catálogo Stripe (lookup_key), mapeia pelo id do Price. */
export async function getPlanIdForStripePriceId(
  stripe: Stripe,
  priceId: string,
): Promise<PlanId | null> {
  const fromEnv = getPlanIdForStripePrice(priceId);
  if (fromEnv) return fromEnv;
  try {
    const price = await stripe.prices.retrieve(priceId);
    return planIdFromCatalogMonthlyLookupKey(price.lookup_key);
  } catch {
    return null;
  }
}

