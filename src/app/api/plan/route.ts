import { NextResponse } from "next/server";
import type { PlanId } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planUpdateSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const plan = parsed.data.plan as PlanId;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { plan },
  });

  return NextResponse.json({ plan: updated.plan });
}
