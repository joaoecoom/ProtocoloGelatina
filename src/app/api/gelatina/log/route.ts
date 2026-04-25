import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/day";

function yesterdayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const date = todayKey();
  const exists = await prisma.gelatinaLog.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });
  if (exists) {
    return NextResponse.json({
      ok: true,
      already: true,
      streak: user.streak,
      date,
    });
  }

  const prev = await prisma.gelatinaLog.findFirst({
    where: { userId: user.id, date: { not: date } },
    orderBy: { date: "desc" },
  });

  let streak = 1;
  if (prev?.date === yesterdayKey()) {
    streak = (user.streak || 0) + 1;
  } else if (prev) {
    streak = 1;
  }

  await prisma.$transaction([
    prisma.gelatinaLog.create({ data: { userId: user.id, date } }),
    prisma.user.update({
      where: { id: user.id },
      data: { streak, lastGelatinaAt: new Date() },
    }),
  ]);

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  return NextResponse.json({
    ok: true,
    streak: fresh?.streak ?? streak,
    date,
  });
}
