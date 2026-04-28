/**
 * Cria (ou reutiliza) Products + Prices mensais em EUR no Stripe, alinhados com PLAN_CATALOG.
 * Idempotente: cada preço usa `lookup_key` fixo `pgi_plan_<PLAN>_monthly_eur`.
 *
 * Requer: STRIPE_SECRET_KEY no .env ou .env.local
 *
 * Uso:
 *   npm run stripe:seed
 *   npm run stripe:seed -- --dry-run
 *   npm run stripe:seed -- --plan FRONT
 */
import "dotenv/config";
import type { PlanId } from "@prisma/client";
import Stripe from "stripe";
import { PLAN_CATALOG } from "@/lib/plans";
import { stripeCatalogMonthlyLookupKey } from "@/lib/stripe";

const API_VERSION = "2026-04-22.dahlia" as const;

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const planIdx = argv.indexOf("--plan");
  const onlyPlan =
    planIdx >= 0 && argv[planIdx + 1] ? (argv[planIdx + 1] as PlanId) : null;
  return { dryRun, onlyPlan };
}

async function main() {
  const { dryRun, onlyPlan } = parseArgs();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("Falta STRIPE_SECRET_KEY no ambiente (.env ou .env.local).");
    process.exit(1);
  }

  let plans = Object.keys(PLAN_CATALOG) as PlanId[];
  if (onlyPlan) {
    if (!PLAN_CATALOG[onlyPlan]) {
      console.error(`Plano desconhecido: ${onlyPlan}`);
      process.exit(1);
    }
    plans = [onlyPlan];
  }

  const stripe = new Stripe(key, { apiVersion: API_VERSION });
  const lines: string[] = [];

  for (const plan of plans) {
    const meta = PLAN_CATALOG[plan];
    const lookupKey = stripeCatalogMonthlyLookupKey(plan);
    const expectedAmount = Math.round(meta.monthlyEuro * 100);

    const listed = await stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 10,
    });

    const activeMonthlyMatch = listed.data.find(
      (p) =>
        p.active &&
        p.type === "recurring" &&
        p.recurring?.interval === "month" &&
        p.currency === "eur" &&
        p.unit_amount === expectedAmount,
    );

    let priceId: string | undefined = activeMonthlyMatch?.id;

    if (priceId) {
      console.log(`OK ${plan}: reutiliza ${priceId} (${lookupKey}) EUR ${meta.monthlyEuro}/mes`);
    } else if (dryRun) {
      console.log(
        `[dry-run] Criaria/atualizaria price EUR ${meta.monthlyEuro}/mes, lookup_key=${lookupKey} (${meta.label})`,
      );
      continue;
    } else {
      const existingProductId =
        listed.data
          .map((p) => (typeof p.product === "string" ? p.product : p.product?.id))
          .find(Boolean) ?? null;

      const productId =
        existingProductId ??
        (
          await stripe.products.create({
            name: meta.label,
            description: meta.description.slice(0, 500),
            metadata: { gelatina_plan_id: plan, source: "stripe-seed-prices" },
          })
        ).id;

      const price = await stripe.prices.create({
        product: productId,
        currency: "eur",
        unit_amount: expectedAmount,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        transfer_lookup_key: true,
        tax_behavior: "exclusive",
        metadata: { gelatina_plan_id: plan },
      });
      priceId = price.id;
      console.log(`OK ${plan}: atualizado para ${priceId} (${lookupKey}) EUR ${meta.monthlyEuro}/mes`);
    }

    if (priceId) lines.push(`STRIPE_PRICE_${plan}="${priceId}"`);
  }

  if (dryRun) {
    console.log("\nReexecuta sem --dry-run para criar o que faltar.");
    return;
  }

  if (lines.length === 0) return;

  console.log("\n# Copia para .env / Vercel (server):\n");
  console.log(lines.join("\n"));
  console.log("\n# Webhook local (Stripe CLI): stripe listen --forward-to localhost:3000/api/stripe/webhook");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
