/**
 * Garante colunas `revenue` e `currency` na tabela `events`.
 * Útil quando o quizdashboard falha com: column "revenue" does not exist (Postgres 42703).
 *
 * Carrega `.env` e depois `.env.local` (como o Next), para aplicar na mesma BD que o `npm run dev`.
 *
 * Uso:
 *   npm run db:ensure-events-columns
 *   npx tsx scripts/ensure-events-columns.ts
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    console.error("DATABASE_URL não definido (.env / .env.local).");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS revenue NUMERIC(14, 2)`,
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS currency TEXT`);
    console.log('OK: colunas "events.revenue" e "events.currency" verificadas/adicionadas.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
