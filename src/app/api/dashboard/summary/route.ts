import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/day";

function progressPercent(params: {
  start?: number | null;
  goal?: number | null;
  current?: number | null;
}) {
  const { start, goal, current } = params;
  if (!start || !goal || !current) return 0;
  const span = start - goal;
  if (span <= 0) return 0;
  const moved = start - current;
  return Math.max(0, Math.min(100, Math.round((moved / span) * 100)));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const date = todayKey();
  const tracking = await prisma.dailyTrack.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  const pct = progressPercent({
    start: user.startWeightKg,
    goal: user.goalWeightKg,
    current: user.weightKg,
  });

  return NextResponse.json({
    user: {
      name: user.name,
      streak: user.streak,
      weightKg: user.weightKg,
      plan: user.plan,
    },
    date,
    tracking,
    progressPercent: pct,
  });
}
