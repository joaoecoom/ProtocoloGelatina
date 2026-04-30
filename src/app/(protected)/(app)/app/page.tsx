import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/day";
import { parseMealScheduleJson } from "@/lib/push/meal-slots";
import { DashboardShell } from "../dashboard/dashboard-shell";

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

export default async function AppPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (!user.onboardingCompleted) redirect("/onboarding");

  const date = todayKey();
  let tracking: Awaited<ReturnType<typeof prisma.dailyTrack.findUnique>> | null = null;
  let chatCountToday = 0;
  let databaseOffline = false;
  try {
    tracking = await prisma.dailyTrack.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    const usage = await prisma.chatUsage.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    chatCountToday = usage?.count ?? 0;
  } catch {
    databaseOffline = true;
  }

  const pct = progressPercent({
    start: user.startWeightKg,
    goal: user.goalWeightKg,
    current: user.weightKg,
  });

  const initialTracking = tracking
    ? {
        waterMl: tracking.waterMl,
        bloating: tracking.bloating,
        energy: tracking.energy,
        hunger: tracking.hunger,
        sleep: tracking.sleep,
        moodNote: tracking.moodNote ?? null,
        markManha: tracking.markManha,
        markAlmoco: tracking.markAlmoco,
        markLanche: tracking.markLanche,
        markJanta: tracking.markJanta,
      }
    : null;

  const serverMealReminderSchedule =
    user.mealReminderSchedule != null ? parseMealScheduleJson(user.mealReminderSchedule) : null;

  return (
    <DashboardShell
      databaseOffline={databaseOffline}
      date={date}
      streak={user.streak}
      pct={pct}
      weightKg={user.weightKg}
      startWeightKg={user.startWeightKg}
      goalWeightKg={user.goalWeightKg}
      mainProblem={user.mainProblem}
      chatCountToday={chatCountToday}
      initialTracking={initialTracking}
      serverMealReminderSchedule={serverMealReminderSchedule}
    />
  );
}
