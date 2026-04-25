"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { gelatinas, protocolIntro, commonMistakes, shoppingList } from "@/lib/content/gelatinas";

type TabId = "gelatinas" | "fases" | "guia" | "extras";

type Props = {
  accessPlan: string;
};

type DailyState = {
  completedDays: number;
  lastDoneYmd: string | null;
};

const DAILY_KEY = "pg-protocolo-daily-v1";
const CYCLE_NAMES = ["Ciclo leve", "Ciclo intensivo", "Ciclo avançado"] as const;

const BASE_GEL_SLUGS = ["limao", "gengibre", "cha-verde", "vinagre", "pepino", "noturna", "kiwi", "banana"] as const;

const FLOW: Array<{
  phaseStart: number;
  phaseEnd: number;
  gelStart: number;
  gelEnd: number;
  phase: string;
  objective: string;
  gelSlug: string;
  title: string;
  strongBenefit: string;
  when: string;
}> = [
  {
    phaseStart: 1,
    phaseEnd: 5,
    gelStart: 1,
    gelEnd: 3,
    phase: "Fase 1 — Desinchar",
    objective: "Desinchar",
    gelSlug: "limao",
    title: "Sensação de leveza e apoio digestivo",
    strongBenefit: "Desincha rápido e reduz barriga em poucos dias",
    when: "Manhã ou antes do almoço",
  },
  {
    phaseStart: 1,
    phaseEnd: 5,
    gelStart: 4,
    gelEnd: 5,
    phase: "Fase 1 — Desinchar",
    objective: "Desinchar",
    gelSlug: "pepino",
    title: "Hidratação profunda e barriga mais calma",
    strongBenefit: "Ajuda a reduzir retenção e deixa o corpo mais leve",
    when: "Fim da manhã ou a meio da tarde",
  },
  {
    phaseStart: 6,
    phaseEnd: 10,
    gelStart: 6,
    gelEnd: 8,
    phase: "Fase 2 — Ativar metabolismo",
    objective: "Ativar metabolismo",
    gelSlug: "gengibre",
    title: "Ativação metabólica e energia estável",
    strongBenefit: "Acelera o metabolismo e ajuda a manter energia ao longo do dia",
    when: "Meio da manhã",
  },
  {
    phaseStart: 6,
    phaseEnd: 10,
    gelStart: 9,
    gelEnd: 10,
    phase: "Fase 2 — Ativar metabolismo",
    objective: "Ativar metabolismo",
    gelSlug: "cha-verde",
    title: "Apoio antioxidante e foco na fome emocional",
    strongBenefit: "Aumenta foco, ajuda no apetite e sustenta o ritmo metabólico",
    when: "Tarde",
  },
  {
    phaseStart: 11,
    phaseEnd: 15,
    gelStart: 11,
    gelEnd: 13,
    phase: "Fase 3 — Controlo de fome",
    objective: "Controlo de fome",
    gelSlug: "vinagre",
    title: "Estabilidade glicémica e controlo de apetite",
    strongBenefit: "Reduz fome e ajuda a estabilizar o apetite ao longo do dia",
    when: "Antes do almoço ou jantar",
  },
  {
    phaseStart: 11,
    phaseEnd: 15,
    gelStart: 14,
    gelEnd: 15,
    phase: "Fase 3 — Controlo de fome",
    objective: "Controlo de fome",
    gelSlug: "kiwi",
    title: "Conforto digestivo acelerado",
    strongBenefit: "Apoia digestão e contribui para um apetite mais equilibrado",
    when: "Final da tarde ou início da noite",
  },
];

const DAY_MICRO_HACKS: Record<number, string> = {
  1: "Evita sal hoje para acelerar o desinchaço.",
  2: "Água morna em jejum ajuda a digestão.",
  3: "Mastiga mais devagar para reduzir barriga inchada.",
  4: "Prioriza legumes no almoço para aliviar retenção.",
  5: "Jantar leve melhora o resultado de amanhã.",
  6: "Faz 10 minutos de caminhada após almoço.",
  7: "Inclui proteína no pequeno-almoço para energia estável.",
  8: "Reduz açúcares líquidos durante este dia.",
  9: "Troca snacks por fruta e água.",
  10: "Respira fundo 3 vezes antes de comer.",
  11: "Começa refeições com vegetais para controlar fome.",
  12: "Evita longos períodos sem comer.",
  13: "Define horários de refeição mais consistentes.",
  14: "Organiza jantar simples e sem excesso de sal.",
  15: "Planeia amanhã para manter ritmo do ciclo.",
};

const DAY_CONTEXTS: Record<number, string> = {
  1: "Nestes primeiros dias estamos a ajudar o corpo a eliminar retenção acumulada.",
  2: "Ainda nesta fase, o foco é libertar líquidos e aliviar desconforto abdominal.",
  3: "Fechamos esta parte inicial a consolidar leveza e digestão.",
  4: "Agora afinamos hidratação e drenagem para manter o desinchaço.",
  5: "Hoje consolidamos o fim da fase de desinchaço com rotina simples.",
  6: "Entramos na fase metabólica para aumentar energia útil no dia.",
  7: "Continuamos a ativação para estabilizar ritmo e disposição.",
  8: "O objetivo é manter metabolismo ativo sem sobrecarregar o corpo.",
  9: "Transição para foco antioxidante e controlo da vontade de petiscar.",
  10: "Fechamos fase metabólica com consistência e energia sustentada.",
  11: "Agora o foco passa para reduzir fome e estabilizar apetite.",
  12: "Nesta fase, regularidade nas refeições melhora muito o controlo de fome.",
  13: "Estamos a consolidar saciedade para evitar deslizes.",
  14: "Hoje o trabalho é digestão leve e apetite mais estável.",
  15: "Fecho do ciclo: preparar o corpo para recomeçar com mais controlo.",
};

const DAY_EXPECTATIONS: Record<number, string> = {
  1: "Se fizeres isto hoje, amanhã vais sentir a barriga mais leve.",
  2: "Se mantiveres este ritmo hoje, amanhã sentes menos inchaço ao acordar.",
  3: "Ao concluir hoje, amanhã o corpo responde com mais leveza digestiva.",
  4: "Ao cumprir hoje, amanhã notas retenção mais controlada.",
  5: "Ao fechar esta fase hoje, amanhã entras no novo passo com base forte.",
  6: "Se cumprires hoje, amanhã vais sentir energia mais estável.",
  7: "Se fizeres o ritual hoje, amanhã a disposição tende a subir.",
  8: "Com consistência hoje, amanhã sentes metabolismo mais ativo.",
  9: "Se fechares hoje, amanhã vais notar foco e apetite mais regulados.",
  10: "Se cumprires hoje, amanhã entras na próxima fase com melhor ritmo.",
  11: "Se fizeres isto hoje, amanhã a fome fica mais controlada.",
  12: "Com este ritual hoje, amanhã reduz a vontade de petiscar.",
  13: "Ao manter hoje, amanhã a saciedade tende a durar mais.",
  14: "Se concluires hoje, amanhã vais acordar com digestão mais confortável.",
  15: "Se fechares este dia, amanhã reentras no ciclo com corpo mais responsivo.",
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function phaseForDay(day: number) {
  return FLOW.find((f) => day >= f.gelStart && day <= f.gelEnd) ?? FLOW[0];
}

function readDailyState(): DailyState {
  if (typeof window === "undefined") return { completedDays: 0, lastDoneYmd: null };
  const raw = window.localStorage.getItem(DAILY_KEY);
  if (!raw) return { completedDays: 0, lastDoneYmd: null };
  try {
    const parsed = JSON.parse(raw) as DailyState;
    return {
      completedDays: Number.isFinite(parsed.completedDays) ? parsed.completedDays : 0,
      lastDoneYmd: typeof parsed.lastDoneYmd === "string" ? parsed.lastDoneYmd : null,
    };
  } catch {
    return { completedDays: 0, lastDoneYmd: null };
  }
}

function writeDailyState(next: DailyState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DAILY_KEY, JSON.stringify(next));
}

export function ProtocoloHub({ accessPlan }: Props) {
  const [tab, setTab] = useState<TabId>("gelatinas");
  const [daily, setDaily] = useState<DailyState>({ completedDays: 0, lastDoneYmd: null });
  const [toast, setToast] = useState<string | null>(null);
  const [ctaPulse, setCtaPulse] = useState(false);

  useEffect(() => {
    setDaily(readDailyState());
  }, []);

  const ymd = todayYmd();
  const doneToday = daily.lastDoneYmd === ymd;
  const currentDay = (daily.completedDays % 15) + 1;
  const cycleIndex = Math.floor(daily.completedDays / 15);
  const cycleName = CYCLE_NAMES[cycleIndex % CYCLE_NAMES.length];
  const todayFlow = phaseForDay(currentDay);
  const nextFlow = phaseForDay(currentDay === 15 ? 1 : currentDay + 1);
  const dayInPhase = currentDay - todayFlow.phaseStart + 1;
  const phaseDays = todayFlow.phaseEnd - todayFlow.phaseStart + 1;
  const daysLeftInPhase = Math.max(0, phaseDays - dayInPhase);
  const phaseProgress = Math.round((dayInPhase / phaseDays) * 100);
  const gel = gelatinas.find((g) => g.slug === todayFlow.gelSlug);
  const contextCopy = DAY_CONTEXTS[currentDay] ?? "Hoje seguimos o protocolo guiado para manter evolução diária.";
  const expectationCopy = DAY_EXPECTATIONS[currentDay] ?? "Se fizeres isto hoje, amanhã vais sentir evolução.";
  const microHack = DAY_MICRO_HACKS[currentDay] ?? "Mantém hidratação e rotina para consolidar resultados.";

  function markTodayDone() {
    if (doneToday) return;
    const next = {
      completedDays: daily.completedDays + 1,
      lastDoneYmd: ymd,
    };
    setDaily(next);
    writeDailyState(next);
    setCtaPulse(true);
    setToast("✨ Ritual concluído. Excelente consistência hoje.");
    window.setTimeout(() => setCtaPulse(false), 600);
    window.setTimeout(() => setToast(null), 3200);
  }

  const baseGelatinas = useMemo(
    () => gelatinas.filter((g) => BASE_GEL_SLUGS.includes(g.slug as (typeof BASE_GEL_SLUGS)[number])),
    [],
  );

  return (
    <div className="space-y-5 pb-6">
      <GlassCard>
        <p className="pg-kicker">Jornada guiada</p>
        <h1 className="font-display mt-2 text-xl font-semibold text-pg-ink">Fase atual: {todayFlow.objective}</h1>
        <p className="mt-1 text-sm font-semibold text-pg-berry">
          Dia {dayInPhase}/{phaseDays} desta fase · Dia {currentDay}/15 do ciclo
        </p>
        <p className="mt-1 text-sm text-pg-forest/85">Progresso da fase: {phaseProgress}%</p>
        <span className="pg-badge mt-3">{cycleName}</span>

        <div className="mt-4 rounded-2xl border border-pg-forest/10 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Receita do dia</p>
          <h2 className="mt-1 text-xl font-semibold text-pg-ink">{todayFlow.title || gel?.name || "Gelatina diária"}</h2>
          <p className="mt-1 text-sm font-semibold text-pg-berry">{todayFlow.strongBenefit}</p>
          <p className="mt-2 text-xs text-pg-forest/70">Quando usar: {todayFlow.when}</p>

          <div className="mt-4 rounded-xl border border-pg-forest/10 bg-pg-mint/25 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Contexto</p>
            <p className="mt-1 text-sm text-pg-forest/85">{contextCopy}</p>
          </div>

          <div className="mt-4 rounded-xl border border-pg-forest/10 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Ritual do dia</p>
            <ul className="mt-2 space-y-1 text-sm text-pg-forest/80">
              <li>✔ Preparar a gelatina do dia</li>
              <li>✔ Beber 1.5L a 2L de água ao longo do dia</li>
              <li>✔ Aplicar o micro-hack do dia</li>
              <li>✔ Fazer check-in no dashboard</li>
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-pg-berry/15 bg-pg-cream/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Micro-hack do dia</p>
            <p className="mt-1 text-sm font-semibold text-pg-ink">{microHack}</p>
          </div>

          <div className="mt-4 rounded-xl border border-pg-forest/10 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Expectativa</p>
            <p className="mt-1 text-sm text-pg-forest/85">{expectationCopy}</p>
          </div>

          <PrimaryButton
            type="button"
            variant={doneToday ? "green" : "rose"}
            className={`mt-4 h-11 w-full text-sm transition-transform ${ctaPulse ? "scale-[1.015]" : "scale-100"}`}
            disabled={doneToday}
            onClick={markTodayDone}
          >
            {doneToday ? "Ritual concluído hoje ✓" : "Marcar ritual como concluído"}
          </PrimaryButton>
          <p className="mt-2 text-xs text-pg-forest/75">Amanhã continuas a fase.</p>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Progresso</p>
        <p className="mt-1 text-sm font-semibold text-pg-ink">{todayFlow.phase}</p>
        <p className="mt-1 text-sm text-pg-forest/80">
          Dia {dayInPhase} de {phaseDays} desta fase
        </p>
        <div className="mt-3 h-2 rounded-full bg-pg-forest/10">
          <div className="h-2 rounded-full bg-pg-berry" style={{ width: `${phaseProgress}%` }} />
        </div>
        <p className="mt-1 text-xs text-pg-forest/70">Faltam {daysLeftInPhase} dias para completar</p>
      </GlassCard>

      <GlassCard className={doneToday ? "border border-emerald-200/70 bg-emerald-50/50" : "border border-pg-forest/10"}>
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Próxima fase</p>
        <p className="mt-1 text-sm font-semibold text-pg-ink">{nextFlow.phase}</p>
        <p className="mt-1 text-xs text-pg-forest/75">
          {doneToday
            ? "Desbloqueada para amanhã. Mantém o ritmo."
            : "Fica desbloqueada quando concluíres o ritual de hoje."}
        </p>
        <Link
          href="/planos"
          className="pg-cta-berry mt-3 inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold"
        >
          Ver fases premium
        </Link>
      </GlassCard>

      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-pg-forest/10 bg-white/70 p-1">
        {[
          { id: "gelatinas", label: "Gelatinas" },
          { id: "fases", label: "Fases Avançadas" },
          { id: "guia", label: "Guia" },
          { id: "extras", label: "Extras" },
        ].map((t) => {
          const active = tab === (t.id as TabId);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as TabId)}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                active ? "bg-pg-berry text-white" : "text-pg-forest/70 hover:bg-pg-mint/60"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "gelatinas" ? (
        <div className="space-y-3">
          <GlassCard className="border border-pg-berry/15 bg-pg-cream/60">
            <p className="text-sm font-semibold text-pg-ink">
              Seguir o protocolo guiado é mais eficaz do que escolher aleatoriamente.
            </p>
          </GlassCard>
          {baseGelatinas.map((g) => (
            <GlassCard key={g.slug}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl">{g.emoji}</p>
                    <h3 className="text-base font-semibold text-neutral-900">{g.name}</h3>
                    <p className="mt-1 text-xs text-rose-500">{g.benefit}</p>
                  </div>
                  <span className="text-xl text-pg-forest/70">⌄</span>
                </summary>
                <ul className="mt-3 border-t border-pg-forest/10 pt-3 space-y-1 text-sm text-neutral-700">
                  {g.recipe.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </details>
            </GlassCard>
          ))}
        </div>
      ) : null}

      {tab === "fases" ? (
        <div className="space-y-3">
          {["Barriga Chapada", "Anti-celulite", "Pós-parto", "Queima Acelerada", "Sono & Recuperação"].map((name) => (
            <GlassCard key={name}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-pg-ink">{name} 🔒</h3>
                  <p className="mt-1 text-xs text-pg-forest/70">Conteúdo premium com plano dirigido.</p>
                </div>
                <Link
                  href="/planos"
                  className="pg-cta-berry inline-flex h-9 items-center justify-center rounded-full px-4 text-xs font-semibold"
                >
                  Desbloquear
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : null}

      {tab === "guia" ? (
        <div className="space-y-3">
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Como preparar</h3>
            <ul className="mt-2 space-y-1 text-sm text-pg-forest/80">
              {protocolIntro.how.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Quando usar</h3>
            <p className="mt-2 text-sm text-pg-forest/80">{protocolIntro.when}</p>
          </GlassCard>
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Erros comuns</h3>
            <ul className="mt-2 space-y-1 text-sm text-pg-forest/80">
              {commonMistakes.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          </GlassCard>
        </div>
      ) : null}

      {tab === "extras" ? (
        <div className="space-y-3">
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Lista de compras</h3>
            <ul className="mt-2 space-y-1 text-sm text-pg-forest/80">
              {shoppingList.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Planos de uso</h3>
            <p className="mt-2 text-sm text-pg-forest/80">Ativa rotinas por horário para aparecer no calendário e receber lembretes.</p>
            <Link href="/protocolo/planos-de-uso" className="mt-2 inline-flex text-xs font-semibold text-pg-berry hover:underline">
              Abrir gestão completa →
            </Link>
          </GlassCard>
          <GlassCard>
            <h3 className="text-base font-semibold text-pg-ink">Protocolos avançados</h3>
            <p className="mt-2 text-sm text-pg-forest/80">Rotações estratégicas para fases com objetivo específico.</p>
            <Link href="/protocolo/protocolos-avancados" className="mt-2 inline-flex text-xs font-semibold text-pg-berry hover:underline">
              Abrir gestão completa →
            </Link>
          </GlassCard>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-pg-berry/20 bg-pg-cream/95 px-4 py-3 text-sm font-semibold text-pg-ink shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
