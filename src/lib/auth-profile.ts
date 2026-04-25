import { PlanId, type User as PrismaUser } from "@prisma/client";
import type { User as AuthUser } from "@supabase/supabase-js";

/** Dados de onboarding espelhados em `auth.users.user_metadata` quando a DB Prisma falha. */
export const PG_ONBOARDING_META_KEY = "pg_onboarding";

export function displayNameFromAuth(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = user.user_metadata;
  const raw =
    typeof meta?.name === "string"
      ? meta.name
      : typeof meta?.full_name === "string"
        ? meta.full_name
        : null;
  if (raw?.trim()) return raw.trim();
  if (user.email) return user.email.split("@")[0] ?? "Utilizador";
  return "Utilizador";
}

function readOnboardingMeta(authUser: AuthUser) {
  const raw = authUser.user_metadata?.[PG_ONBOARDING_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/**
 * Perfil em memória a partir da sessão Supabase + opcionalmente `user_metadata.pg_onboarding`
 * (quando o Postgres/Prisma não está disponível ou a linha ainda não existe).
 */
export function buildFallbackPrismaUser(authUser: AuthUser): PrismaUser {
  const now = new Date();
  const ob = readOnboardingMeta(authUser);

  const age = typeof ob?.age === "number" ? ob.age : null;
  const heightCm = typeof ob?.heightCm === "number" ? ob.heightCm : null;
  const weightKg = typeof ob?.weightKg === "number" ? ob.weightKg : null;
  const goalWeightKg = typeof ob?.goalWeightKg === "number" ? ob.goalWeightKg : null;
  const goal = typeof ob?.goal === "string" ? ob.goal : null;
  const mainProblem = typeof ob?.mainProblem === "string" ? ob.mainProblem : null;
  const onboardingCompleted = Boolean(ob?.completed);

  return {
    id: authUser.id,
    email: (authUser.email ?? "").toLowerCase(),
    name: displayNameFromAuth(authUser),
    plan: PlanId.FRONT,
    onboardingCompleted,
    age,
    heightCm,
    weightKg,
    goalWeightKg,
    goal,
    mainProblem,
    streak: 0,
    lastGelatinaAt: null,
    startWeightKg: weightKg,
    welcomeGuideDismissedAt: null,
    isSuperAdmin: false,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  } as PrismaUser;
}
