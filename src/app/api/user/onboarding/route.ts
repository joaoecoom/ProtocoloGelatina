import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PG_ONBOARDING_META_KEY } from "@/lib/auth-profile";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = {
    age: parsed.data.age,
    heightCm: parsed.data.heightCm,
    weightKg: parsed.data.weightKg,
    goalWeightKg: parsed.data.goalWeightKg ?? parsed.data.weightKg,
    goal: parsed.data.goal,
    mainProblem: parsed.data.mainProblem,
    startWeightKg: parsed.data.weightKg,
    onboardingCompleted: true,
  };
  const quiz = parsed.data.quiz ?? {
    sleepDifficulty: 3,
    digestiveDiscomfort: 3,
    stressLevel: 3,
    afternoonEnergyDip: 3,
    mealRegularity: 3,
    hydrationConsistency: 3,
  };

  async function storeOnAuthMetadata() {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        [PG_ONBOARDING_META_KEY]: {
          age: payload.age,
          heightCm: payload.heightCm,
          weightKg: payload.weightKg,
          goalWeightKg: payload.goalWeightKg,
          goal: payload.goal,
          mainProblem: payload.mainProblem,
          quiz,
          completed: true,
        },
      },
    });
    return error;
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: payload,
    });
    // Mesmo quando a DB atualiza, guardar quiz no metadata para radar/segmentação.
    void storeOnAuthMetadata();
    return NextResponse.json({ ok: true, stored: "database" });
  } catch (e) {
    console.error("[api/user/onboarding] prisma", e);
  }

  const error = await storeOnAuthMetadata();

  if (error) {
    return NextResponse.json(
      {
        error:
          "Não foi possível guardar: a base de dados não responde e a sessão Auth não aceitou o backup. Confirma DATABASE_URL no .env (Supabase → Settings → Database → URI, porta 5432 ou pooler 6543) e `npx prisma db push`.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, stored: "auth_metadata" });
}
