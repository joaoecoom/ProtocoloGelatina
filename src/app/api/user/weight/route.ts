import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  weightKg: z.coerce.number().min(35).max(250),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Peso inválido." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { weightKg: parsed.data.weightKg },
  });

  return NextResponse.json({ weightKg: updated.weightKg });
}
