import type { PushSubscription, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isPlanActiveOnDate,
  mergeStoredPlansWithTemplates,
  parseProtocolPlanCheckinsJson,
  planDaysRemainingOnDate,
} from "@/lib/protocol-plans";
import {
  DEFAULT_MEAL_SCHEDULE,
  MEAL_SLOT_KEYS,
  MEAL_SLOT_LABELS,
  parseMealScheduleJson,
  timeToMinutes,
  wallClockHourAndMinute,
  wallClockMinutes,
  ymdCalendarDaysBetween,
  ymdInTimeZone,
  type MealSlotKey,
} from "@/lib/push/meal-slots";
import { sendWebPushToEndpoint, type PushPayload } from "@/lib/push/server-send";

type UserWithSubs = User & { pushSubscriptions: PushSubscription[] };

type Prefs = { daily?: boolean; progress?: boolean; reactivation?: boolean };

function prefsAllowDaily(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return true;
  return (raw as Prefs).daily !== false;
}

function prefsAllowProgress(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return true;
  return (raw as Prefs).progress !== false;
}

function prefsAllowReactivation(raw: unknown): boolean {
  if (raw == null || typeof raw !== "object") return true;
  return (raw as Prefs).reactivation !== false;
}

function inHourWindow(hour: number, minute: number, targetHour: number, maxMinute = 5) {
  return hour === targetHour && minute <= maxMinute;
}

/** Janela de 6 minutos a partir do horário do slot (cron a cada 5 min). */
function inMealReminderWindow(nowMin: number, slotMin: number) {
  return nowMin >= slotMin && nowMin <= slotMin + 5;
}

async function sendOnceLogged(
  user: UserWithSubs,
  dateYmd: string,
  kind: string,
  payload: PushPayload,
): Promise<number> {
  if (kind.length > 64) {
    kind = kind.slice(0, 64);
  }
  const existing = await prisma.pushReminderLog.findUnique({
    where: { userId_dateYmd_kind: { userId: user.id, dateYmd, kind } },
  });
  if (existing) return 0;
  let delivered = 0;
  for (const sub of user.pushSubscriptions) {
    const ok = await sendWebPushToEndpoint(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload,
    );
    if (ok) delivered += 1;
  }
  if (delivered > 0) {
    await prisma.pushReminderLog.create({
      data: { userId: user.id, dateYmd, kind },
    });
  }
  return delivered;
}

async function runMealsForUser(user: UserWithSubs, now: Date): Promise<number> {
  if (!prefsAllowDaily(user.notificationPrefs)) return 0;
  const tz = user.reminderTimeZone?.trim() || "Europe/Lisbon";
  const dateYmd = ymdInTimeZone(now, tz);
  const nowMin = wallClockMinutes(now, tz);
  const schedule = user.mealReminderSchedule
    ? parseMealScheduleJson(user.mealReminderSchedule)
    : DEFAULT_MEAL_SCHEDULE;

  let tracking = null;
  try {
    tracking = await prisma.dailyTrack.findUnique({
      where: { userId_date: { userId: user.id, date: dateYmd } },
    });
  } catch {
    return 0;
  }

  let sent = 0;
  for (const slot of MEAL_SLOT_KEYS) {
    const slotMin = timeToMinutes(schedule[slot]);
    if (!inMealReminderWindow(nowMin, slotMin)) continue;
    const marked = tracking?.[slot as keyof typeof tracking];
    if (marked === true) continue;
    const kind: MealSlotKey = slot;
    const label = MEAL_SLOT_LABELS[slot];
    sent += await sendOnceLogged(user, dateYmd, kind, {
      title: "Marcação da refeição",
      body: `Marca o teu ${label.toLowerCase()} agora.`,
      tag: `pg-meal-${dateYmd}-${kind}`,
      url: "/app",
    });
  }
  return sent;
}

function planCheckinKey(planId: string, dateYmd: string) {
  return `${planId}:${dateYmd}`;
}

async function runProtocolPlansForUser(user: UserWithSubs, now: Date): Promise<number> {
  if (!prefsAllowProgress(user.notificationPrefs)) return 0;
  const plans = mergeStoredPlansWithTemplates(user.activeProtocolPlans);
  if (!plans.length) return 0;
  const checkins = parseProtocolPlanCheckinsJson(user.protocolPlanCheckins);
  const tz = user.reminderTimeZone?.trim() || "Europe/Lisbon";
  const dateYmd = ymdInTimeZone(now, tz);
  const { hour, minute } = wallClockHourAndMinute(now, tz);

  let sent = 0;

  for (const plan of plans) {
    if (!isPlanActiveOnDate(plan, dateYmd)) continue;

    const ck = planCheckinKey(plan.id, dateYmd);
    if (checkins[ck]) continue;

    if (inHourWindow(hour, minute, plan.recommendedHour, 5)) {
      const kind = `g:${plan.id}:${dateYmd}`.slice(0, 64);
      sent += await sendOnceLogged(user, dateYmd, kind, {
        title: "Hora da tua gelatina",
        body: `${plan.title} — marca quando tomares a gelatina desta rotina.`,
        tag: `pg-gel-${plan.id}`,
        url: "/protocolo",
      });
    }
  }

  return sent;
}

async function runProgressForUser(user: UserWithSubs, now: Date): Promise<number> {
  if (!prefsAllowProgress(user.notificationPrefs)) return 0;
  const plans = mergeStoredPlansWithTemplates(user.activeProtocolPlans);
  if (!plans.length) return 0;
  const tz = user.reminderTimeZone?.trim() || "Europe/Lisbon";
  const dateYmd = ymdInTimeZone(now, tz);
  const { hour, minute } = wallClockHourAndMinute(now, tz);
  if (!inHourWindow(hour, minute, 18, 5)) return 0;

  let sent = 0;
  for (const plan of plans) {
    if (!isPlanActiveOnDate(plan, dateYmd)) continue;
    const remaining = planDaysRemainingOnDate(plan, dateYmd);
    if (remaining !== 2) continue;
    const kind = `p2:${plan.id}:${dateYmd}`.slice(0, 64);
    sent += await sendOnceLogged(user, dateYmd, kind, {
      title: "Quase a terminar a fase",
      body: `Faltam 2 dias para acabar «${plan.title}». Mantém o ritmo.`,
      tag: `pg-prog-${plan.id}`,
      url: "/protocolo",
    });
  }
  return sent;
}

async function runReactivationForUser(user: UserWithSubs, now: Date): Promise<number> {
  if (!prefsAllowReactivation(user.notificationPrefs)) return 0;
  const tz = user.reminderTimeZone?.trim() || "Europe/Lisbon";
  const dateYmd = ymdInTimeZone(now, tz);
  const { hour, minute } = wallClockHourAndMinute(now, tz);
  if (!inHourWindow(hour, minute, 10, 5)) return 0;

  const todayYmd = dateYmd;
  const lastYmd = user.lastGelatinaAt ? ymdInTimeZone(user.lastGelatinaAt, tz) : null;
  const createdYmd = ymdInTimeZone(user.createdAt, tz);

  let eligible = false;
  if (lastYmd) {
    eligible = ymdCalendarDaysBetween(lastYmd, todayYmd) >= 2;
  } else {
    eligible = user.streak === 0 && ymdCalendarDaysBetween(createdYmd, todayYmd) >= 1;
  }
  if (!eligible) return 0;

  const kind = `r:${dateYmd}`.slice(0, 64);
  return sendOnceLogged(user, dateYmd, kind, {
    title: "Volta ao teu ritual",
    body: "Abre o protocolo e retoma o ciclo — um passo de cada vez.",
    tag: "pg-reactivate",
    url: "/app",
  });
}

export async function runAllPushReminders(now = new Date()) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return {
      ok: false as const,
      skipped: "missing_vapid",
      meals: 0,
      plans: 0,
      progress: 0,
      reactivation: 0,
      sent: 0,
      users: 0,
    };
  }

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    include: { pushSubscriptions: true },
  });

  let meals = 0;
  let plans = 0;
  let progress = 0;
  let reactivation = 0;

  for (const user of users) {
    meals += await runMealsForUser(user, now);
    plans += await runProtocolPlansForUser(user, now);
    progress += await runProgressForUser(user, now);
    reactivation += await runReactivationForUser(user, now);
  }

  return {
    ok: true as const,
    meals,
    plans,
    progress,
    reactivation,
    sent: meals + plans + progress + reactivation,
    users: users.length,
  };
}

/** @deprecated Usa `runAllPushReminders`; mantido para imports antigos. */
export async function runMealPushReminders(now = new Date()) {
  const r = await runAllPushReminders(now);
  if (!r.ok) return { ok: false as const, skipped: r.skipped, sent: 0 };
  return { ok: true as const, sent: r.meals, users: r.users };
}
