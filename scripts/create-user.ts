/**
 * Cria utilizador no Supabase Auth + linha em `User` (Prisma).
 * Requer no .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *
 * Uso:
 *   npx tsx scripts/create-user.ts <email> <password> [nome] [plan] [--superadmin]
 *   npm run user:create -- gelatinaadmin@gmail.com "Casca2020." "Gelatina Admin" FRONT --superadmin
 *
 * Se omitires nome, usa a parte local do email. Plano por omissão: FRONT.
 * `--superadmin`: acesso total a conteúdos (equivale a gates do plano máximo).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { PlanId, PrismaClient } from "@prisma/client";

const PLAN_IDS = new Set<string>(Object.values(PlanId));

function deriveName(email: string) {
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseArgs() {
  const isSuperAdmin = process.argv.includes("--superadmin");
  const tokens = process.argv.slice(2).filter((t) => t !== "--superadmin");
  const [email, password, ...rest] = tokens;
  if (!email || !password) {
    console.error(
      "Uso: npx tsx scripts/create-user.ts <email> <password> [nome …] [plan] [--superadmin]\n" +
        'Ex.: npm run user:create -- gelatinaadmin@gmail.com "Casca2020." "Gelatina Admin" FRONT --superadmin',
    );
    process.exit(1);
  }

  let plan: PlanId = PlanId.FRONT;
  let name: string;

  if (rest.length === 0) {
    name = deriveName(email);
  } else {
    const last = rest[rest.length - 1]!;
    const lastUp = last.toUpperCase();
    if (PLAN_IDS.has(lastUp)) {
      plan = lastUp as PlanId;
      const nameParts = rest.slice(0, -1);
      name = nameParts.length > 0 ? nameParts.join(" ") : deriveName(email);
    } else {
      name = rest.join(" ");
    }
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    name,
    plan,
    isSuperAdmin,
  };
}

const { email: EMAIL, password: PASSWORD, name: NAME, plan: PLAN, isSuperAdmin: IS_SUPERADMIN } =
  parseArgs();

async function findAuthUserIdByEmail(
  admin: { auth: { admin: { listUsers: (opts: { page: number; perPage: number }) => Promise<unknown> } } },
  email: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = (await admin.auth.admin.listUsers({
      page,
      perPage,
    })) as {
      data?: { users?: { id: string; email?: string | null }[] };
      error?: unknown;
    };
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env (Project Settings → API → service_role).",
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prisma = new PrismaClient();

  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: NAME },
  });

  let userId: string;

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered") ||
      msg.includes("duplicate")
    ) {
      const id = await findAuthUserIdByEmail(admin, EMAIL);
      if (!id) {
        console.error("Utilizador existe em Auth mas não foi possível obter o id:", error.message);
        process.exit(1);
      }
      userId = id;
      await admin.auth.admin.updateUserById(userId, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { name: NAME },
      });
      console.log("Conta já existia — password e metadata actualizados.");
    } else {
      console.error("Erro Supabase Auth:", error.message);
      process.exit(1);
    }
  } else if (!created.user?.id) {
    console.error("Resposta sem utilizador.");
    process.exit(1);
  } else {
    userId = created.user.id;
    console.log("Utilizador criado no Supabase Auth.");
  }

  try {
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: EMAIL,
        name: NAME,
        plan: PLAN,
        onboardingCompleted: true,
        isSuperAdmin: IS_SUPERADMIN,
      },
      update: {
        email: EMAIL,
        name: NAME,
        plan: PLAN,
        onboardingCompleted: true,
        isSuperAdmin: IS_SUPERADMIN,
      },
    });
    console.log(
      "Prisma `User` OK:",
      EMAIL,
      "plan:",
      PLAN,
      IS_SUPERADMIN ? "superadmin" : "",
      "→",
      userId,
    );
  } catch (e) {
    console.warn(
      "Auth OK, mas Prisma não ligou à base (verifica DATABASE_URL / rede / Supabase → Database → Network restrictions).",
    );
    console.warn("Na primeira entrada na app, o perfil é criado automaticamente quando a DB responder.");
    console.warn(e instanceof Error ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
