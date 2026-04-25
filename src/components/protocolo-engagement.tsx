"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";

type Props = {
  accessPlan: string;
  streak: number;
};

type PremiumPhase = {
  id: string;
  name: string;
  objective: string;
  durationDays: number;
};

const PREMIUM_PHASES: PremiumPhase[] = [
  { id: "barriga-chapada", name: "Barriga Chapada", objective: "Reduzir inchaço e reforçar firmeza abdominal.", durationDays: 5 },
  { id: "anti-celulite", name: "Anti-Celulite", objective: "Melhorar retenção e textura da pele com rotina dirigida.", durationDays: 4 },
  { id: "pos-parto", name: "Pós-Parto", objective: "Recuperação progressiva com foco em energia e consistência.", durationDays: 5 },
  { id: "queima-acelerada", name: "Queima Acelerada", objective: "Ativar ritmo metabólico com estrutura alimentar.", durationDays: 3 },
  { id: "sono-recuperacao", name: "Sono & Recuperação", objective: "Melhorar descanso, stress e recuperação noturna.", durationDays: 4 },
];

const LEVELS = [
  { name: "Iniciante", minDays: 0, nextAt: 7 },
  { name: "Consistente", minDays: 7, nextAt: 21 },
  { name: "Ativo", minDays: 21, nextAt: 45 },
  { name: "Transformação", minDays: 45, nextAt: 90 },
  { name: "Elite", minDays: 90, nextAt: null as number | null },
];

function phaseKey(id: string) {
  return `pg-phase-complete-${id}`;
}

function achievementKey(id: string) {
  return `pg-achievement-${id}`;
}

export function ProtocoloEngagement({ accessPlan, streak }: Props) {
  const premiumUnlocked = accessPlan !== "FRONT";
  const [popup, setPopup] = useState<string | null>(null);
  const [phaseDone, setPhaseDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const map: Record<string, boolean> = {};
    for (const p of PREMIUM_PHASES) {
      map[p.id] = window.localStorage.getItem(phaseKey(p.id)) === "1";
    }
    return map;
  });

  const level = useMemo(() => {
    return [...LEVELS].reverse().find((l) => streak >= l.minDays) ?? LEVELS[0];
  }, [streak]);
  const levelProgress = useMemo(() => {
    if (level.nextAt == null) return 100;
    const span = Math.max(1, level.nextAt - level.minDays);
    const moved = Math.max(0, streak - level.minDays);
    return Math.max(0, Math.min(100, Math.round((moved / span) * 100)));
  }, [level, streak]);

  function showOnce(id: string, message: string) {
    if (typeof window === "undefined") return;
    const key = achievementKey(id);
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
    setPopup(message);
    window.setTimeout(() => setPopup(null), 3400);
  }

  function completePhase(id: string, name: string) {
    if (!premiumUnlocked || typeof window === "undefined") return;
    window.localStorage.setItem(phaseKey(id), "1");
    setPhaseDone((prev) => ({ ...prev, [id]: true }));
    showOnce(`phase-${id}`, `Conquista desbloqueada: fase "${name}" concluída.`);
  }

  useEffect(() => {
    if (streak >= 1) showOnce(`day-${streak}`, "Conquista: dia completo registado.");
    if (streak >= 7) showOnce("streak-7", "Conquista: 7 dias consecutivos.");
    if (streak >= 21) showOnce("streak-21", "Conquista: 21 dias de consistência.");
  }, [streak]);

  return (
    <div className="space-y-5">
      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Nível</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-lg font-semibold text-pg-ink">{level.name}</p>
          <span className="rounded-full bg-pg-mint px-3 py-1 text-xs font-bold text-pg-forest">{streak} dias</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-pg-forest/10">
          <div className="h-2 rounded-full bg-pg-berry" style={{ width: `${levelProgress}%` }} />
        </div>
        <p className="mt-1 text-xs text-pg-forest/70">
          {level.nextAt == null ? "Nível máximo atingido." : `Faltam ${Math.max(0, level.nextAt - streak)} dias para o próximo nível.`}
        </p>
      </GlassCard>

      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Fases premium</p>
        <div className="mt-3 space-y-2.5">
          {PREMIUM_PHASES.map((phase) => {
            const done = phaseDone[phase.id];
            return (
              <div key={phase.id} className="rounded-2xl border border-pg-forest/10 bg-white/75 px-3 py-2.5">
                <p className="text-sm font-semibold text-pg-ink">{phase.name}</p>
                <p className="mt-0.5 text-xs text-pg-forest/75">{phase.objective}</p>
                <p className="mt-1 text-[11px] text-pg-forest/70">Duração: {phase.durationDays} dias</p>
                <PrimaryButton
                  type="button"
                  variant={!premiumUnlocked ? "ghost" : done ? "ghost" : "rose"}
                  className="mt-2 h-9 w-full text-xs"
                  disabled={!premiumUnlocked || done}
                  onClick={() => completePhase(phase.id, phase.name)}
                >
                  {!premiumUnlocked ? "Desbloquear (premium)" : done ? "Concluída" : "Desbloquear"}
                </PrimaryButton>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {popup ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-pg-berry/20 bg-pg-cream/95 px-4 py-3 text-sm font-semibold text-pg-ink shadow-xl">
          🏆 {popup}
        </div>
      ) : null}
    </div>
  );
}
