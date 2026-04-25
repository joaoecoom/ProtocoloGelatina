"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrimaryButton } from "@/components/primary-button";
import { GlassCard } from "@/components/glass-card";
import { WaterCupsVisual } from "@/components/water-cups-visual";
import {
  hasPlanCheckin,
  isPlanActiveOnDate,
  markPlanCheckin,
  syncProtocolPlansStateToServer,
  type ActiveProtocolPlan,
} from "@/lib/protocol-plans";
import {
  DEFAULT_MEAL_SCHEDULE,
  MEAL_SLOT_KEYS,
  MEAL_SLOT_LABELS,
  type MealSlotKey,
} from "@/lib/push/meal-slots";

const ML_CUP = 200;
const MAX_CUPS = 25;

const DAY_SLOTS = MEAL_SLOT_KEYS.map((key) => ({
  key,
  label: MEAL_SLOT_LABELS[key],
  defaultTime: DEFAULT_MEAL_SCHEDULE[key],
}));

type SlotKey = MealSlotKey;

type Tracking = {
  waterMl: number;
  bloating: number;
  energy: number;
  hunger: number;
  sleep: number;
  moodNote: string | null;
  markManha: boolean;
  markAlmoco: boolean;
  markLanche: boolean;
  markJanta: boolean;
} | null;

type Props = {
  initialTracking: Tracking;
  initialDate: string;
  activePlans?: ActiveProtocolPlan[];
  /** Sem ligação ao Postgres — não persistir tracking/gelatina. */
  databaseOffline?: boolean;
  /** Horários guardados no servidor para lembretes push (null = só localStorage até sincronizar). */
  serverMealReminderSchedule?: Record<MealSlotKey, string> | null;
};

function snapMlToCups(ml: number) {
  return Math.max(0, Math.min(MAX_CUPS * ML_CUP, Math.round(ml / ML_CUP) * ML_CUP));
}

function mlToCups(ml: number) {
  return Math.max(0, Math.min(MAX_CUPS, Math.round(ml / ML_CUP)));
}

function notificationStorageKey(date: string, slot: SlotKey) {
  return `pg-notif-${date}-${slot}`;
}

function slotScheduleStorageKey(slot: SlotKey) {
  return `pg-slot-schedule-${slot}`;
}

function slotFoodStorageKey(date: string, slot: SlotKey) {
  return `pg-slot-food-${date}-${slot}`;
}

function slotSkippedStorageKey(date: string, slot: SlotKey) {
  return `pg-slot-skipped-${date}-${slot}`;
}

function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function buildSlotScheduleFromSources(server: Record<MealSlotKey, string> | null | undefined): Record<MealSlotKey, string> {
  const base: Record<MealSlotKey, string> = { ...DEFAULT_MEAL_SCHEDULE };
  if (typeof window !== "undefined") {
    for (const key of MEAL_SLOT_KEYS) {
      const loc = window.localStorage.getItem(slotScheduleStorageKey(key));
      if (loc) base[key] = loc;
    }
  }
  if (server) {
    for (const key of MEAL_SLOT_KEYS) {
      if (server[key]) base[key] = server[key];
    }
  }
  return base;
}

function readPushActiveFromStorage() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("pg-push-active") === "1";
}

function publishRadarSnapshot(snapshot: {
  waterMl: number;
  bloating: number;
  energy: number;
  hunger: number;
  sleep: number;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("pg-radar-snapshot-v1", JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("pg-radar-refresh"));
}

function baseTracking(t: Tracking): NonNullable<Tracking> {
  return {
    waterMl: t?.waterMl ?? 0,
    moodNote: t?.moodNote ?? null,
    bloating: t?.bloating ?? 0,
    energy: t?.energy ?? 0,
    hunger: t?.hunger ?? 0,
    sleep: t?.sleep ?? 0,
    markManha: t?.markManha ?? false,
    markAlmoco: t?.markAlmoco ?? false,
    markLanche: t?.markLanche ?? false,
    markJanta: t?.markJanta ?? false,
  };
}

export function DashboardClient({
  initialTracking,
  initialDate,
  activePlans = [],
  databaseOffline = false,
  serverMealReminderSchedule = null,
}: Props) {
  const [tracking, setTracking] = useState<Tracking>(initialTracking);
  const [checkinDraft, setCheckinDraft] = useState<NonNullable<Tracking>>(
    () => baseTracking(initialTracking),
  );
  const [moodDraft, setMoodDraft] = useState(() => "");
  const [slotSchedule, setSlotSchedule] = useState<Record<SlotKey, string>>(() =>
    buildSlotScheduleFromSources(serverMealReminderSchedule),
  );
  const [pushActive, setPushActive] = useState(false);
  const [slotFood, setSlotFood] = useState<Record<SlotKey, string>>({
    markManha: "",
    markAlmoco: "",
    markLanche: "",
    markJanta: "",
  });
  const [slotSkipped, setSlotSkipped] = useState<Record<SlotKey, boolean>>({
    markManha: false,
    markAlmoco: false,
    markLanche: false,
    markJanta: false,
  });
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [tick, setTick] = useState(0);
  const [, setPlanCheckBust] = useState(0);
  const didWaterSnap = useRef(false);
  const scheduleSyncTimer = useRef<number | null>(null);

  const patchTracking = useCallback(
    async (partial: Partial<NonNullable<Tracking>>) => {
      if (databaseOffline) return;
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { tracking: NonNullable<Tracking> };
      setTracking(data.tracking);
      return data.tracking;
    },
    [databaseOffline],
  );

  useEffect(() => {
    setTracking(initialTracking);
    setCheckinDraft(baseTracking(initialTracking));
    setMoodDraft("");
  }, [initialTracking]);

  useEffect(() => {
    publishRadarSnapshot({
      waterMl: checkinDraft.waterMl,
      bloating: checkinDraft.bloating,
      energy: checkinDraft.energy,
      hunger: checkinDraft.hunger,
      sleep: checkinDraft.sleep,
    });
  }, [checkinDraft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPushActive(readPushActiveFromStorage());
    const onFocus = () => setPushActive(readPushActiveFromStorage());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSlotSchedule(buildSlotScheduleFromSources(serverMealReminderSchedule));
    setSlotFood({
      markManha: window.localStorage.getItem(slotFoodStorageKey(initialDate, "markManha")) ?? "",
      markAlmoco: window.localStorage.getItem(slotFoodStorageKey(initialDate, "markAlmoco")) ?? "",
      markLanche: window.localStorage.getItem(slotFoodStorageKey(initialDate, "markLanche")) ?? "",
      markJanta: window.localStorage.getItem(slotFoodStorageKey(initialDate, "markJanta")) ?? "",
    });
    setSlotSkipped({
      markManha: window.localStorage.getItem(slotSkippedStorageKey(initialDate, "markManha")) === "1",
      markAlmoco: window.localStorage.getItem(slotSkippedStorageKey(initialDate, "markAlmoco")) === "1",
      markLanche: window.localStorage.getItem(slotSkippedStorageKey(initialDate, "markLanche")) === "1",
      markJanta: window.localStorage.getItem(slotSkippedStorageKey(initialDate, "markJanta")) === "1",
    });
  }, [initialDate, serverMealReminderSchedule]);

  useEffect(() => {
    return () => {
      if (scheduleSyncTimer.current) window.clearTimeout(scheduleSyncTimer.current);
    };
  }, []);

  useEffect(() => {
    if (databaseOffline || didWaterSnap.current) return;
    if (!initialTracking) return;
    if (initialTracking.waterMl > 0 && initialTracking.waterMl % ML_CUP !== 0) {
      didWaterSnap.current = true;
      const next = snapMlToCups(initialTracking.waterMl);
      void patchTracking({ waterMl: next });
    }
  }, [databaseOffline, initialTracking, patchTracking]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (databaseOffline || pushActive) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const maybeNotify = () => {
      const now = new Date();
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const minute = now.getMinutes();

      for (const slot of DAY_SLOTS) {
        if (timeToMinutes(slotSchedule[slot.key]) > minutesNow || minute > 5) continue;
        if (tracking?.[slot.key] || slotSkipped[slot.key]) continue;
        const key = notificationStorageKey(initialDate, slot.key);
        if (window.localStorage.getItem(key)) continue;
        new Notification("Marcação da refeição", {
          body: `Marca o teu ${slot.label.toLowerCase()} agora.`,
        });
        window.localStorage.setItem(key, "1");
      }
    };

    maybeNotify();
    const timer = window.setInterval(maybeNotify, 30_000);
    return () => clearInterval(timer);
  }, [databaseOffline, initialDate, pushActive, slotSchedule, slotSkipped, tracking]);

  useEffect(() => {
    if (databaseOffline || pushActive || !activePlans.length) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const notifyPlans = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      if (minute > 5) return;

      const duePlans = activePlans.filter((plan) => isPlanActiveOnDate(plan, initialDate) && plan.recommendedHour === hour);
      for (const plan of duePlans) {
        if (hasPlanCheckin(plan.id, initialDate)) continue;
        const key = `pg-plan-notif-${initialDate}-${plan.id}`;
        if (window.localStorage.getItem(key)) continue;
        new Notification("Hora da tua gelatina", {
          body: `${plan.title} — marca quando tomares a gelatina desta rotina.`,
        });
        window.localStorage.setItem(key, "1");
      }
    };

    notifyPlans();
    const timer = window.setInterval(notifyPlans, 30_000);
    return () => clearInterval(timer);
  }, [activePlans, databaseOffline, initialDate, pushActive]);

  const sliders = useMemo(
    () => [
      { key: "bloating" as const, label: "Inchaço", emoji: "🫧" },
      { key: "energy" as const, label: "Energia", emoji: "⚡️" },
      { key: "hunger" as const, label: "Fome", emoji: "🍽️" },
      { key: "sleep" as const, label: "Sono", emoji: "🌙" },
    ],
    [],
  );

  function setWaterCups(cupCount: number) {
    const c = Math.max(0, Math.min(MAX_CUPS, cupCount));
    const waterMl = c * ML_CUP;
    setCheckinDraft((t) => ({ ...t, waterMl }));
  }

  const cups = mlToCups(checkinDraft.waterMl ?? 0);
  const todayPlans = useMemo(
    () => activePlans.filter((plan) => isPlanActiveOnDate(plan, initialDate)),
    [activePlans, initialDate],
  );

  const nowMinutes = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, [tick]);
  const orderedSlots = useMemo(
    () => [...DAY_SLOTS].sort((a, b) => timeToMinutes(slotSchedule[a.key]) - timeToMinutes(slotSchedule[b.key])),
    [slotSchedule],
  );
  const dueSlots = orderedSlots.filter((s) => timeToMinutes(slotSchedule[s.key]) <= nowMinutes);
  const currentSlot = dueSlots[dueSlots.length - 1] ?? orderedSlots[0];
  const unresolved = dueSlots.filter((s) => !tracking?.[s.key] && !slotSkipped[s.key]);
  const previousMissingSlot = unresolved.find((s) => s.key !== currentSlot.key) ?? null;
  const activeSlot = previousMissingSlot ?? currentSlot;
  const activeSlotMarked = Boolean(tracking?.[activeSlot.key]);
  const checkinExpanded = !activeSlotMarked || Boolean(previousMissingSlot);
  const nearMealWindow = orderedSlots.some(
    (s) => Math.abs(timeToMinutes(slotSchedule[s.key]) - nowMinutes) <= 20,
  );
  const shouldAutoExpandPanel = nearMealWindow && (!activeSlotMarked || Boolean(previousMissingSlot));

  useEffect(() => {
    if (shouldAutoExpandPanel) setPanelExpanded(true);
  }, [shouldAutoExpandPanel]);

  async function submitMomentCheckin(key: SlotKey) {
    if (databaseOffline) return;
    const meal = slotFood[key].trim();
    if (!meal) return;
    const slotLabel = DAY_SLOTS.find((s) => s.key === key)?.label ?? "refeição";
    const moodNote = [`${slotLabel}: ${meal}`, moodDraft.trim()].filter(Boolean).join("\n");
    const payload: Partial<NonNullable<Tracking>> = {
      waterMl: checkinDraft.waterMl,
      moodNote,
      bloating: checkinDraft.bloating,
      energy: checkinDraft.energy,
      hunger: checkinDraft.hunger,
      sleep: checkinDraft.sleep,
      [key]: true,
    };
    const row = await patchTracking(payload);
    if (!row) return;
    setTracking(row);
    setCheckinDraft(baseTracking(row));
    setMoodDraft("");
    setSlotFood((prev) => ({ ...prev, [key]: "" }));
    setSlotSkipped((prev) => ({ ...prev, [key]: false }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(slotFoodStorageKey(initialDate, key), "");
      window.localStorage.removeItem(slotSkippedStorageKey(initialDate, key));
    }
  }

  function scheduleServerSync(next: Record<SlotKey, string>) {
    if (databaseOffline) return;
    if (scheduleSyncTimer.current) window.clearTimeout(scheduleSyncTimer.current);
    scheduleSyncTimer.current = window.setTimeout(() => {
      scheduleSyncTimer.current = null;
      void fetch("/api/user/meal-reminder-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    }, 800);
  }

  function updateSlotSchedule(key: SlotKey, value: string) {
    setSlotSchedule((prev) => {
      const next = { ...prev, [key]: value };
      scheduleServerSync(next);
      return next;
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(slotScheduleStorageKey(key), value);
    }
  }

  function updateSlotFood(key: SlotKey, value: string) {
    setSlotFood((prev) => ({ ...prev, [key]: value }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(slotFoodStorageKey(initialDate, key), value);
    }
  }

  function skipSlot(key: SlotKey) {
    setSlotSkipped((prev) => ({ ...prev, [key]: true }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(slotSkippedStorageKey(initialDate, key), "1");
    }
  }

  function markPlanAsDone(planId: string) {
    markPlanCheckin(planId, initialDate);
    setPlanCheckBust((n) => n + 1);
    void syncProtocolPlansStateToServer();
  }

  return (
    <div className="space-y-5">
      <GlassCard>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pg-rose-muted">
          Painel de hoje · {initialDate}
        </p>
        <button
          type="button"
          onClick={() => setPanelExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-pg-forest/10 bg-white/70 px-3 py-2 text-left"
          aria-expanded={panelExpanded}
        >
          <div>
            <p className="text-xs font-semibold text-pg-ink">
              {panelExpanded ? "Ocultar painel" : "Abrir painel de marcação"}
            </p>
            <p className="text-[11px] text-pg-forest/70">
              Atual: {activeSlot.label} {activeSlotMarked ? "· marcado" : "· por marcar"}
            </p>
          </div>
          <span className="text-sm text-pg-berry">{panelExpanded ? "▴" : "▾"}</span>
        </button>

        {panelExpanded ? (
          <>
        <div className="mt-4">
          <p className="text-xs font-semibold text-pg-forest/70">Momentos do dia</p>
          <p className="mt-0.5 text-[11px] text-pg-forest/60">
            A app lembra conforme os teus horários. Faz uma marcação por refeição.
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-pg-berry hover:underline"
            onClick={() => setShowScheduleEditor((v) => !v)}
          >
            {showScheduleEditor ? "Fechar horários" : "Mudar horários de refeição"}
          </button>
          {showScheduleEditor ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DAY_SLOTS.map((s) => (
                <label key={s.key} className="rounded-xl border border-pg-forest/10 bg-white/70 p-2">
                  <span className="text-[11px] font-semibold text-pg-forest/70">{s.label}</span>
                  <input
                    type="time"
                    value={slotSchedule[s.key]}
                    onChange={(e) => updateSlotSchedule(s.key, e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-pg-forest/15 px-2 text-xs"
                  />
                </label>
              ))}
            </div>
          ) : null}
          <div className="mt-3 rounded-2xl border border-pg-berry/20 bg-pg-cream/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-berry/80">
              Marcação atual: {activeSlot.label}
            </p>
            {previousMissingSlot ? (
              <p className="mt-1 text-xs text-amber-900">
                Não marcaste {previousMissingSlot.label.toLowerCase()}. Saltaste essa refeição ou queres marcar agora?
              </p>
            ) : null}
            {previousMissingSlot ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                  onClick={() => skipSlot(previousMissingSlot.key)}
                >
                  Saltei essa refeição
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {checkinExpanded ? (
          <>
        <div className="mt-5">
          <label
            className="text-sm font-semibold text-pg-ink/90"
            htmlFor="food-now"
          >
            O que comeste no {activeSlot.label.toLowerCase()}?
          </label>
          <textarea
            id="food-now"
            name="foodNow"
            rows={2}
            maxLength={500}
            disabled={databaseOffline}
            value={slotFood[activeSlot.key]}
            onChange={(e) => updateSlotFood(activeSlot.key, e.target.value)}
            placeholder="Ex.: iogurte + fruta + aveia"
            className="mt-2 w-full resize-y rounded-2xl border border-pg-forest/10 bg-white/90 px-3 py-2.5 text-sm text-pg-ink shadow-inner placeholder:text-pg-forest/40 focus:border-pg-berry/25 focus:outline-none focus:ring-2 focus:ring-pg-berry/10 disabled:opacity-50"
          />
          <label className="mt-3 block text-sm font-semibold text-pg-ink/90" htmlFor="mood-now">
            Como te sentes agora?
          </label>
          <textarea
            id="mood-now"
            name="moodNow"
            rows={2}
            maxLength={500}
            disabled={databaseOffline}
            value={moodDraft}
            onChange={(e) => setMoodDraft(e.target.value)}
            placeholder="Energia, humor, foco, digestão..."
            className="mt-2 w-full resize-y rounded-2xl border border-pg-forest/10 bg-white/90 px-3 py-2.5 text-sm text-pg-ink shadow-inner placeholder:text-pg-forest/40 focus:border-pg-berry/25 focus:outline-none focus:ring-2 focus:ring-pg-berry/10 disabled:opacity-50"
          />
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-pg-ink/90">
            <span>Até ao {activeSlot.label.toLowerCase()}, quantos copos de água bebeste?</span>
            <span className="tabular-nums text-pg-forest">
              {cups} {cups === 1 ? "copo" : "copos"} · {cups * ML_CUP} ml
            </span>
          </div>
          <div className="mt-3">
            <WaterCupsVisual count={cups} maxCups={8} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={databaseOffline || cups <= 0}
              onClick={() => setWaterCups(cups - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-pg-forest/15 bg-pg-mint/50 text-xl font-bold text-pg-forest transition hover:bg-pg-mint disabled:opacity-40"
              aria-label="Menos um copo"
            >
              −
            </button>
            <button
              type="button"
              disabled={databaseOffline || cups >= MAX_CUPS}
              onClick={() => setWaterCups(cups + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-pg-forest/15 bg-pg-mint/50 text-xl font-bold text-pg-forest transition hover:bg-pg-mint disabled:opacity-40"
              aria-label="Mais um copo"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-pg-forest/10 pt-5">
          {sliders.map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between text-sm font-semibold text-pg-ink/90">
                <span>
                  {s.emoji} {s.label}
                </span>
                <span className="rounded-full border border-pg-berry/10 bg-pg-cream px-2 py-0.5 text-xs font-bold text-pg-berry">
                  {checkinDraft[s.key]}/5
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                disabled={databaseOffline}
                value={checkinDraft[s.key]}
                onChange={(e) =>
                  setCheckinDraft((t) => ({
                    ...t,
                    [s.key]: Number(e.target.value),
                  }))
                }
                className="mt-2 w-full accent-pg-berry-light"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={
            databaseOffline ||
            Boolean(tracking?.[activeSlot.key]) ||
            !slotFood[activeSlot.key].trim()
          }
          onClick={() => void submitMomentCheckin(activeSlot.key)}
          className="pg-cta-berry mt-5 flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {tracking?.[activeSlot.key]
            ? `${activeSlot.label} já marcado`
            : `Marcar ${activeSlot.label.toLowerCase()} agora`}
        </button>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-pg-forest/15 bg-pg-mint/35 px-4 py-3">
            <p className="text-sm font-semibold text-pg-forest">
              {activeSlot.label} já marcado.
            </p>
            <p className="mt-1 text-xs text-pg-forest/80">
              Este check-in fica compacto e reabre automaticamente na próxima refeição.
            </p>
          </div>
        )}
          </>
        ) : null}

        <div className="mt-8 border-t border-pg-forest/10 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-pg-berry/80">
            Protocolo
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-pg-forest/90">
            O teu <strong>ritual e receitas do dia</strong> estão no ecrã do protocolo. Abre o
            guia, segue a fase certa e volta aqui para registar o que precisas.
          </p>
          <Link href="/protocolo" className="pg-cta-berry mt-4 flex h-14 w-full items-center justify-center rounded-full text-[15px] font-semibold tracking-tight">
            Abrir o meu protocolo
          </Link>
        </div>

        {todayPlans.length ? (
          <div className="mt-6 border-t border-pg-forest/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-berry/80">Planos ativos de hoje</p>
            <div className="mt-2.5 space-y-2">
              {todayPlans.map((plan) => {
                const done = hasPlanCheckin(plan.id, initialDate);
                return (
                  <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-pg-forest/10 bg-white/75 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-pg-ink">{plan.title}</p>
                      <p className="text-xs text-pg-forest/70">
                        {String(plan.recommendedHour).padStart(2, "0")}:00 · {done ? "feito hoje" : "por fazer"}
                      </p>
                    </div>
                    <PrimaryButton
                      type="button"
                      variant={done ? "ghost" : "rose"}
                      className="h-9 px-4 text-xs"
                      disabled={done}
                      onClick={() => markPlanAsDone(plan.id)}
                    >
                      {done ? "Concluído" : "Marcar"}
                    </PrimaryButton>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
