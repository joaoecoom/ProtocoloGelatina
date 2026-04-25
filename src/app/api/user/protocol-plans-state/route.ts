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
    await prisma.user.update({
      where: { id: user.id },
      data: {
        activeProtocolPlans: activePlans,
        protocolPlanCheckins: checkins ?? {},
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user/protocol-plans-state]", e);
    return NextResponse.json({ error: "Não foi possível guardar." }, { status: 500 });
  }
}
