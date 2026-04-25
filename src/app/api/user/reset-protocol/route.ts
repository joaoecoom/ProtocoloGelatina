import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { PG_ONBOARDING_META_KEY } from "@/lib/auth-profile";

/**
 * Reinício de primeira utilização:
 * - apaga tracking diário, registos de gelatina e chat (uso + histórico)
 * - limpa metas/dados de onboarding e força onboarding novamente
 * - repõe streak e última gelatina
 * - mantém conta, email, nome e plano
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    // Base do reset (resiliente mesmo se o schema Prisma estiver à frente da DB).
    await prisma.$transaction([
      prisma.dailyTrack.deleteMany({ where: { userId: user.id } }),
      prisma.gelatinaLog.deleteMany({ where: { userId: user.id } }),
      prisma.chatUsage.deleteMany({ where: { userId: user.id } }),
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET
            "streak" = 0,
            "lastGelatinaAt" = NULL,
            "onboardingCompleted" = false,
            "age" = NULL,
            "weightKg" = NULL,
            "goalWeightKg" = NULL,
            "goal" = NULL,
            "mainProblem" = NULL,
            "startWeightKg" = NULL,
            "welcomeGuideDismissedAt" = NULL,
            "activeProtocolPlans" = NULL,
            "protocolPlanCheckins" = NULL,
            "updatedAt" = NOW()
          WHERE "id" = ${user.id}::uuid
        `,
      ),
    ]);

    // Complemento opcional: histórico novo da Jéssica.
    // Em ambientes com cliente Prisma antigo, `chatMessage` pode não existir em runtime.
    const maybeChatMessage = (prisma as unknown as { chatMessage?: { deleteMany: (args: unknown) => Promise<unknown> } }).chatMessage;
    if (maybeChatMessage?.deleteMany) {
      await maybeChatMessage.deleteMany({ where: { userId: user.id } }).catch(() => {});
    }

    // Limpa também o backup em user_metadata para evitar loop de onboarding concluído.
    const supabase = await createClient();
    await supabase.auth.updateUser({
      data: {
        [PG_ONBOARDING_META_KEY]: { completed: false },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user/reset-protocol]", e);
    return NextResponse.json(
      { error: "Não foi possível reiniciar a atividade. Tenta mais tarde." },
      { status: 503 },
    );
  }
}
