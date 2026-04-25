import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@prisma/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import {
  PG_ONBOARDING_META_KEY,
  buildFallbackPrismaUser,
  displayNameFromAuth,
} from "@/lib/auth-profile";

function hasMinimumOnboardingData(params: {
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  goal?: string | null;
  mainProblem?: string | null;
}) {
  return Boolean(
    params.age &&
      params.heightCm &&
      params.weightKg &&
      params.goal?.trim() &&
      params.mainProblem?.trim(),
  );
}

/**
 * Garante linha em `User` (Prisma) a partir do utilizador Auth.
 * Se a base falhar, devolve perfil mínimo em memória.
 */
export async function syncProfileForAuthUser(authUser: AuthUser): Promise<User> {
  const email = (authUser.email ?? "").toLowerCase();
  const name = displayNameFromAuth(authUser);
  const onboardingMeta = authUser.user_metadata?.[PG_ONBOARDING_META_KEY] as
    | { completed?: unknown; age?: unknown; heightCm?: unknown; weightKg?: unknown; goalWeightKg?: unknown; goal?: unknown; mainProblem?: unknown }
    | undefined;

  try {
    const row = await prisma.user.upsert({
      where: { id: authUser.id },
      create: {
        id: authUser.id,
        email,
        name,
      },
      update: { email },
    });

    const rowHasRequiredData = hasMinimumOnboardingData({
      age: row.age,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      goal: row.goal,
      mainProblem: row.mainProblem,
    });

    const metaHasRequiredData = hasMinimumOnboardingData({
      age: typeof onboardingMeta?.age === "number" ? onboardingMeta.age : null,
      heightCm: typeof onboardingMeta?.heightCm === "number" ? onboardingMeta.heightCm : null,
      weightKg: typeof onboardingMeta?.weightKg === "number" ? onboardingMeta.weightKg : null,
      goal: typeof onboardingMeta?.goal === "string" ? onboardingMeta.goal : null,
      mainProblem:
        typeof onboardingMeta?.mainProblem === "string" ? onboardingMeta.mainProblem : null,
    });

    // Só tratamos onboarding como concluído se existir payload mínimo completo.
    if (!rowHasRequiredData && onboardingMeta?.completed === true && metaHasRequiredData) {
      return {
        ...row,
        onboardingCompleted: true,
        age: typeof onboardingMeta.age === "number" ? onboardingMeta.age : row.age,
        heightCm: typeof onboardingMeta.heightCm === "number" ? onboardingMeta.heightCm : row.heightCm,
        weightKg: typeof onboardingMeta.weightKg === "number" ? onboardingMeta.weightKg : row.weightKg,
        goalWeightKg:
          typeof onboardingMeta.goalWeightKg === "number"
            ? onboardingMeta.goalWeightKg
            : row.goalWeightKg,
        goal: typeof onboardingMeta.goal === "string" ? onboardingMeta.goal : row.goal,
        mainProblem:
          typeof onboardingMeta.mainProblem === "string"
            ? onboardingMeta.mainProblem
            : row.mainProblem,
      };
    }

    if (row.onboardingCompleted && !rowHasRequiredData) {
      return { ...row, onboardingCompleted: false };
    }

    return row;
  } catch {
    try {
      const found = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (found) return found;
    } catch {
      /* ligação à base indisponível */
    }
    return buildFallbackPrismaUser(authUser);
  }
}

/**
 * Utilizador autenticado + perfil alinhado com `User` (Prisma ou fallback).
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  let authUser = (await supabase.auth.getUser()).data.user;
  if (!authUser) {
    const session = (await supabase.auth.getSession()).data.session;
    authUser = session?.user ?? null;
  }

  if (!authUser?.id || !authUser.email) return null;

  return syncProfileForAuthUser(authUser);
}
