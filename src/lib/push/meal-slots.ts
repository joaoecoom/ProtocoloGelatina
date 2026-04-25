export const MEAL_SLOT_KEYS = ["markManha", "markAlmoco", "markLanche", "markJanta"] as const;
export type MealSlotKey = (typeof MEAL_SLOT_KEYS)[number];

export const MEAL_SLOT_LABELS: Record<MealSlotKey, string> = {
  markManha: "Pequeno-almoço",
  markAlmoco: "Almoço",
  markLanche: "Lanche",
  markJanta: "Jantar",
};

export const DEFAULT_MEAL_SCHEDULE: Record<MealSlotKey, string> = {
  markManha: "08:00",
  markAlmoco: "13:00",
  markLanche: "17:00",
  markJanta: "20:00",
};

export function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function parseMealScheduleJson(raw: unknown): Record<MealSlotKey, string> {
  const base = { ...DEFAULT_MEAL_SCHEDULE };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of MEAL_SLOT_KEYS) {
    const v = o[key];
    if (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) {
      const [hh, mm] = v.split(":");
      const h = String(Math.min(23, Math.max(0, Number(hh)))).padStart(2, "0");
      const m = String(Math.min(59, Math.max(0, Number(mm)))).padStart(2, "0");
      base[key] = `${h}:${m}`;
    }
  }
  return base;
}

export function wallClockMinutes(d: Date, timeZone: string): number {
  const { hour, minute } = wallClockHourAndMinute(d, timeZone);
  return hour * 60 + minute;
}

export function wallClockHourAndMinute(d: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

/** Diferença em dias de calendário entre duas datas `YYYY-MM-DD` (b a partir de a). */
export function ymdCalendarDaysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function ymdInTimeZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
