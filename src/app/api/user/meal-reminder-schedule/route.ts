import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { mealReminderScheduleSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = mealReminderScheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Horários inválidos." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { mealReminderSchedule: parsed.data },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/user/meal-reminder-schedule]", e);
    return NextResponse.json({ error: "Não foi possível guardar." }, { status: 500 });
  }
}
