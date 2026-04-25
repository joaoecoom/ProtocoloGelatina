"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardMiniCalendar } from "@/components/dashboard-mini-calendar";
import { GlassCard } from "@/components/glass-card";
import { DashboardClient } from "@/components/dashboard-client";
import { WeightForm } from "@/components/weight-form";
import { ProgressRadar } from "@/components/progress-radar";
import {
  hasPlanCheckin,
  isPlanActiveOnDate,
  normalizeYmd,
  readActiveProtocolPlans,
  type ActiveProtocolPlan,
} from "@/lib/protocol-plans";

export type DashboardTracking = {
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

export type DashboardContentProps = {
  databaseOffline: boolean;
  date: string;
  streak: number;
  pct: number;
  weightKg: number | null;
  startWeightKg?: number | null;
  goalWeightKg?: number | null;
  mainProblem?: string | null;
  chatCountToday?: number;
  initialTracking: DashboardTracking;
};

export function DashboardContent({
  databaseOffline,
  date,
  streak,
  pct,
  weightKg,
  startWeightKg,
  goalWeightKg,
  mainProblem,
  chatCountToday = 0,
  initialTracking,
}: DashboardContentProps) {
  const [activePlans, setActivePlans] = useState<ActiveProtocolPlan[]>([]);
  const [liveWeightKg, setLiveWeightKg] = useState<number | null>(weightKg);

  useEffect(() => {
    setActivePlans(readActiveProtocolPlans());
  }, []);

  useEffect(() => {
    setLiveWeightKg(weightKg);
  }, [weightKg]);

  const livePct = useMemo(() => {
    if (!startWeightKg || !goalWeightKg || !liveWeightKg) return pct;
    const span = startWeightKg - goalWeightKg;
    if (span <= 0) return 0;
    const moved = startWeightKg - liveWeightKg;
    return Math.max(0, Math.min(100, Math.round((moved / span) * 100)));
  }, [startWeightKg, goalWeightKg, liveWeightKg, pct]);

  const planMarks = useMemo(() => {
    if (!activePlans.length) return {};
    const marks: Record<string, { colors: string[]; done?: boolean }> = {};
    const start = new Date(`${date}T12:00:00`);

    for (let delta = -35; delta <= 35; delta += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + delta);
      const ymd = normalizeYmd(d);
      const activeToday = activePlans.filter((plan) => isPlanActiveOnDate(plan, ymd));
      if (!activeToday.length) continue;
      const done = activeToday.every((plan) => hasPlanCheckin(plan.id, ymd));
      marks[ymd] = { colors: activeToday.map((plan) => plan.color), done };
    }
    return marks;
  }, [activePlans, date]);

  const todayActionText = useMemo(() => {
    if (!initialTracking) return "Faz o teu primeiro check-in de hoje.";
    if (!initialTracking.markManha) return "Marca o pequeno-almoço e o estado de hoje.";
    if (!initialTracking.markAlmoco) return "Segue para o check-in do almoço.";
    if (!initialTracking.markLanche) return "Faz o check-in do lanche para manter o ritmo.";
    if (!initialTracking.markJanta) return "Fecha o dia com o check-in do jantar.";
    return "Dia bem feito. Mantém o ritual amanhã.";
  }, [initialTracking]);

  return (
    <div className="space-y-5">
      {databaseOffline ? (
        <p
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          A base de dados não responde (ex.: <code className="rounded bg-amber-100/80 px-1">DATABASE_URL</code> no
          Supabase). O dashboard abre em modo só leitura local; corrige a ligação para guardar água, sintomas e
          gelatina.
        </p>
      ) : null}

      <GlassCard>
        <p className="pg-kicker">Hoje no teu protocolo</p>
        <p className="mt-1 text-sm font-semibold text-pg-ink">{todayActionText}</p>
        <p className="mt-1 text-xs text-pg-forest/70">
          Próximo passo claro, sem complicar.
        </p>
        <a
          href="/protocolo"
          className="pg-cta-forest mt-3 inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-semibold"
        >
          Abrir protocolo de hoje
        </a>
      </GlassCard>

      <DashboardMiniCalendar highlightDate={date} planMarks={planMarks} />

      <GlassCard className="grid grid-cols-2 gap-2 py-3">
        <div>
          <p className="text-[11px] font-medium text-pg-forest/60">Sequência</p>
          <p className="text-xl font-semibold leading-none tabular-nums text-pg-forest-light">{streak} dias</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-pg-forest/60">Progresso</p>
          <p className="text-xl font-semibold leading-none tabular-nums text-pg-berry-light">{livePct}%</p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] font-medium text-pg-forest/60">Peso atual</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="text-[16px] font-semibold tabular-nums text-pg-ink">
              {liveWeightKg ? `${liveWeightKg} kg` : "—"}
            </p>
            <WeightForm
              initial={liveWeightKg ?? undefined}
              disabled={databaseOffline}
              onSaved={(next) => setLiveWeightKg(next)}
            />
          </div>
        </div>
      </GlassCard>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pg-rose-muted">Evolução</p>
          <a href="/jessica" className="text-xs font-semibold text-pg-berry hover:underline">
            Afinar com a Jéssica
          </a>
        </div>
        <ProgressRadar
          compact
          weightKg={liveWeightKg}
          pct={livePct}
          bloating={initialTracking?.bloating ?? 0}
          energy={initialTracking?.energy ?? 0}
          hunger={initialTracking?.hunger ?? 0}
          sleep={initialTracking?.sleep ?? 0}
          mainProblem={mainProblem}
          chatCountToday={chatCountToday}
        />
      </div>

      <DashboardClient
        activePlans={activePlans}
        databaseOffline={databaseOffline}
        initialDate={date}
        initialTracking={initialTracking}
      />
    </div>
  );
}
