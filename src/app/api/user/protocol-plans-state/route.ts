import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { protocolPlansStateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = protocolPlansStateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { activePlans, checkins } = parsed.data;

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        activeProtocolPlans: activePlans,
        protocolPlanCheckins: checkins ?? {},
      },
      update: {
        activeProtocolPlans: activePlans,
        protocolPlanCheckins: checkins ?? {},
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user/protocol-plans-state]", e);
    const detail =
      e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "";

    // Ambientes desfasados (db/schema antigos) podem não ter estes campos ainda.
    // Não devemos bloquear a experiência no dashboard por causa desta sincronização auxiliar.
    if (
      detail.includes("Unknown argument `activeProtocolPlans`") ||
      detail.includes("Unknown argument `protocolPlanCheckins`")
    ) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "protocol-plans-state fields unavailable",
      });
    }
    return NextResponse.json(
      {
        error: "Não foi possível guardar.",
        ...(process.env.NODE_ENV === "development" && detail ? { detail } : {}),
      },
      { status: 500 },
    );
  }
}
