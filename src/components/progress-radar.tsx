"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/glass-card";

type Props = {
  weightKg: number | null;
  pct: number;
  bloating: number;
  energy: number;
  hunger: number;
  sleep: number;
  mainProblem?: string | null;
  chatCountToday?: number;
  compact?: boolean;
};

type RadarMetric = {
  key: string;
  label: string;
  score: number; // 0..5
};

type PulseState = {
  updatedAt: string;
  energy: number;
  hunger: number;
  sleep: number;
  bloating: number;
  stress: number;
  nextPromptAt: string;
};

const PULSE_KEY = "pg-radar-pulse-v1";
const ONBOARDING_QUIZ_KEY = "pg-onboarding-quiz-v1";

type OnboardingQuiz = {
  sleepDifficulty: number;
  digestiveDiscomfort: number;
  stressLevel: number;
  afternoonEnergyDip: number;
  mealRegularity: number;
  hydrationConsistency: number;
};

const QUESTION_BANK: Array<{
  id: string;
  label: string;
  metric: keyof Omit<PulseState, "updatedAt" | "nextPromptAt">;
  style: "direta" | "mascarada";
}> = [
  { id: "q-energy", label: "Direta: como está a tua energia hoje?", metric: "energy", style: "direta" },
  { id: "q-hunger", label: "Mascarada: quanta vontade de petiscar tiveste hoje?", metric: "hunger", style: "mascarada" },
  { id: "q-sleep", label: "Direta: como avalias o teu sono da última noite?", metric: "sleep", style: "direta" },
  { id: "q-bloat", label: "Mascarada: como sentes a barriga ao fim do dia?", metric: "bloating", style: "mascarada" },
  { id: "q-stress", label: "Direta: qual o teu nível de stress agora?", metric: "stress", style: "direta" },
];

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function point(cx: number, cy: number, r: number, angle: number) {
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  return `${x},${y}`;
}

function splitLabel(label: string) {
  if (label.length <= 12) return [label];
  const words = label.split(" ");
  if (words.length < 2) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function ProgressRadar({
  weightKg,
  pct,
  bloating,
  energy,
  hunger,
  sleep,
  mainProblem,
  chatCountToday = 0,
  compact = false,
}: Props) {
  const [liveSnapshot, setLiveSnapshot] = useState<{
    waterMl: number;
    bloating: number;
    energy: number;
    hunger: number;
    sleep: number;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("pg-radar-snapshot-v1");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        waterMl: number;
        bloating: number;
        energy: number;
        hunger: number;
        sleep: number;
      };
    } catch {
      return null;
    }
  });

  const [quizBaseline, setQuizBaseline] = useState<OnboardingQuiz | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(ONBOARDING_QUIZ_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OnboardingQuiz;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      const raw = window.localStorage.getItem("pg-radar-snapshot-v1");
      if (!raw) return;
      try {
        setLiveSnapshot(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      const quizRaw = window.localStorage.getItem(ONBOARDING_QUIZ_KEY);
      if (!quizRaw) return;
      try {
        setQuizBaseline(JSON.parse(quizRaw));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pg-radar-refresh", handler);
    return () => window.removeEventListener("pg-radar-refresh", handler);
  }, []);

  const [pulse, setPulse] = useState<PulseState | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PULSE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PulseState;
      return parsed;
    } catch {
      return null;
    }
  });

  const [questionIndex, setQuestionIndex] = useState(() => {
    const day = new Date().getDate();
    return day % QUESTION_BANK.length;
  });

  const shouldPrompt = useMemo(() => {
    if (!pulse?.nextPromptAt) return true;
    return new Date(pulse.nextPromptAt).getTime() <= Date.now();
  }, [pulse]);

  function savePulse(metric: keyof Omit<PulseState, "updatedAt" | "nextPromptAt">, score: number) {
    const next: PulseState = {
      updatedAt: new Date().toISOString(),
      energy: pulse?.energy ?? 3,
      hunger: pulse?.hunger ?? 3,
      sleep: pulse?.sleep ?? 3,
      bloating: pulse?.bloating ?? 3,
      stress: pulse?.stress ?? 3,
      nextPromptAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(), // 12h
    };
    next[metric] = score;
    if (typeof window !== "undefined") window.localStorage.setItem(PULSE_KEY, JSON.stringify(next));
    setPulse(next);
    setQuestionIndex((i) => (i + 1) % QUESTION_BANK.length);
  }

  const sourceEnergy = liveSnapshot?.energy ?? energy;
  const sourceHunger = liveSnapshot?.hunger ?? hunger;
  const sourceSleep = liveSnapshot?.sleep ?? sleep;
  const sourceBloating = liveSnapshot?.bloating ?? bloating;
  const hydrationBonus = Math.min(1, (liveSnapshot?.waterMl ?? 0) / 1200);

  const mixedEnergy = pulse ? Math.round((sourceEnergy + pulse.energy) / 2) : sourceEnergy;
  const mixedHunger = pulse ? Math.round((sourceHunger + pulse.hunger) / 2) : sourceHunger;
  const mixedSleep = pulse ? Math.round((sourceSleep + pulse.sleep) / 2) : sourceSleep;
  const mixedBloating = pulse ? Math.round((sourceBloating + pulse.bloating) / 2) : sourceBloating;
  const mixedStress = pulse?.stress ?? Math.max(0, Math.min(5, Math.round((mixedSleep + mixedEnergy) / 2) - Math.round(mixedBloating / 2)));

  const metrics = useMemo<RadarMetric[]>(() => {
    // Centro = saúde perfeita (0). Quanto mais para fora, pior (até 5).
    const weightProblem = weightKg == null ? 2.5 : Math.max(0, Math.min(5, 5 - pct / 20));
    const weightAdjusted = mainProblem === "fome-descontrolada" ? Math.min(5, weightProblem + 0.2) : weightProblem;
    const energyProblemCurrent = Math.max(0, Math.min(5, 5 - (mixedEnergy + hydrationBonus * 0.4)));
    const sleepProblemCurrent = Math.max(0, Math.min(5, 5 - mixedSleep));
    const bloatingProblemCurrent = Math.max(0, Math.min(5, mixedBloating));
    const hungerProblemCurrent = Math.max(0, Math.min(5, mixedHunger));
    const stressProblemCurrent = Math.max(0, Math.min(5, mixedStress - Math.min(1, chatCountToday * 0.15)));

    // Baseline do quiz inicial (estudo da pessoa) interligado com o estado atual.
    const energyProblem = quizBaseline
      ? Math.round((energyProblemCurrent + quizBaseline.afternoonEnergyDip) / 2)
      : energyProblemCurrent;
    const sleepProblem = quizBaseline
      ? Math.round((sleepProblemCurrent + quizBaseline.sleepDifficulty) / 2)
      : sleepProblemCurrent;
    const bloatingProblem = quizBaseline
      ? Math.round((bloatingProblemCurrent + quizBaseline.digestiveDiscomfort) / 2)
      : bloatingProblemCurrent;
    const hungerProblem = quizBaseline
      ? Math.round((hungerProblemCurrent + quizBaseline.mealRegularity) / 2)
      : hungerProblemCurrent;
    const stressProblem = quizBaseline
      ? Math.round((stressProblemCurrent + quizBaseline.stressLevel) / 2)
      : stressProblemCurrent;

    return [
      { key: "peso", label: "Peso", score: weightAdjusted },
      { key: "energia", label: "Falta de energia", score: energyProblem },
      { key: "fome", label: "Fome", score: hungerProblem },
      { key: "sono", label: "Dificuldade em dormir", score: sleepProblem },
      { key: "inchaco", label: "Barriga inchada", score: bloatingProblem },
      { key: "stress", label: "Stress", score: stressProblem },
    ];
  }, [weightKg, pct, mixedEnergy, mixedHunger, mixedSleep, mixedBloating, mixedStress, mainProblem, hydrationBonus, chatCountToday, quizBaseline]);

  const size = compact ? 214 : 250;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = compact ? 63 : 74;
  const start = -Math.PI / 2;
  const count = metrics.length;

  const rings = [1, 2, 3, 4, 5];
  const axisAngles = metrics.map((_, i) => start + (i * 2 * Math.PI) / count);

  const polygonPoints = metrics
    .map((m, i) => point(cx, cy, maxR * clamp01(m.score / 5), axisAngles[i]))
    .join(" ");
  // Referência visual de saúde "boa" (2 linhas após o centro).
  const healthyTargetScore = 2;
  const healthyTargetPoints = metrics
    .map((_, i) => point(cx, cy, maxR * clamp01(healthyTargetScore / 5), axisAngles[i]))
    .join(" ");

  const avgProblem = metrics.reduce((acc, m) => acc + m.score, 0) / metrics.length;
  const overall = Math.round((1 - avgProblem / 5) * 100);

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pg-rose-muted">Centro da evolução</p>
          <p className="mt-1 text-sm text-pg-forest/80">Leitura rápida dos pontos mais importantes.</p>
        </div>
        <div className="rounded-full bg-pg-mint px-3 py-1 text-sm font-bold text-pg-forest">{overall}%</div>
      </div>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className={compact ? "h-[214px] w-[214px]" : "h-[250px] w-[250px]"}
          role="img"
          aria-label="Radar de progresso com peso, energia, fome, sono, inchaço e stress"
        >
          {rings.map((ring) => {
            const r = (maxR * ring) / 5;
            const ringPoints = axisAngles.map((a) => point(cx, cy, r, a)).join(" ");
            return (
              <polygon
                key={ring}
                points={ringPoints}
                fill="none"
                stroke="rgba(45,75,63,0.15)"
                strokeWidth={1}
              />
            );
          })}

          {axisAngles.map((a, i) => (
            <line
              key={metrics[i].key}
              x1={cx}
              y1={cy}
              x2={cx + maxR * Math.cos(a)}
              y2={cy + maxR * Math.sin(a)}
              stroke="rgba(45,75,63,0.2)"
              strokeWidth={1}
            />
          ))}

          <polygon
            points={healthyTargetPoints}
            fill="rgba(39, 174, 96, 0.10)"
            stroke="rgba(39, 174, 96, 0.65)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <polygon points={polygonPoints} fill="rgba(191, 31, 106, 0.24)" stroke="#BF1F6A" strokeWidth={2} />

          {metrics.map((m, i) => {
            const labelR = maxR + (compact ? 25 : 30);
            const x = cx + labelR * Math.cos(axisAngles[i]);
            const y = cy + labelR * Math.sin(axisAngles[i]);
            const lines = splitLabel(m.label);
            return (
              <text
                key={`${m.key}-label`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`fill-pg-forest font-semibold ${compact ? "text-[8px]" : "text-[9px]"}`}
              >
                {lines.map((line, idx) => (
                  <tspan key={`${m.key}-${line}`} x={x} dy={idx === 0 ? 0 : 11}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      </div>

      {!compact && shouldPrompt ? (
        <div className="mt-4 rounded-2xl border border-pg-berry/20 bg-pg-cream/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pg-rose-muted">
            Check-in rápido ({QUESTION_BANK[questionIndex].style})
          </p>
          <p className="mt-1 text-sm text-pg-ink">{QUESTION_BANK[questionIndex].label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => savePulse(QUESTION_BANK[questionIndex].metric, n)}
                className="rounded-full border border-pg-forest/20 bg-white px-3 py-1 text-xs font-semibold text-pg-forest hover:border-pg-berry/30"
              >
                {n}/5
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-pg-forest/75">
            Estas respostas atualizam o radar ao longo do tempo e ajudam a personalizar contacto e acompanhamento.
          </p>
          <Link href="/jessica" className="mt-2 inline-flex text-xs font-semibold text-pg-berry hover:underline">
            Falar com a Jéssica sobre este ponto
          </Link>
        </div>
      ) : null}
    </GlassCard>
  );
}
