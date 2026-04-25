"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

const QUIZ_QUESTIONS = [
  { key: "sleepDifficulty", label: "Dificuldade em dormir bem", hint: "1 = nenhuma, 5 = muita" },
  { key: "digestiveDiscomfort", label: "Barriga inchada / desconforto digestivo", hint: "1 = leve, 5 = muito" },
  { key: "stressLevel", label: "Stress acumulado no dia", hint: "1 = baixo, 5 = alto" },
  { key: "afternoonEnergyDip", label: "Quebra de energia à tarde", hint: "1 = nunca, 5 = sempre" },
  { key: "mealRegularity", label: "Irregularidade nos horários das refeições", hint: "1 = regular, 5 = irregular" },
  { key: "hydrationConsistency", label: "Dificuldade em beber água suficiente", hint: "1 = fácil, 5 = difícil" },
] as const;

type QuizKey = (typeof QUIZ_QUESTIONS)[number]["key"];

export function OnboardingForm() {
  const router = useRouter();
  const [age, setAge] = useState(32);
  const [heightCm, setHeightCm] = useState(165);
  const [weightKg, setWeightKg] = useState(68);
  const [goalWeightKg, setGoalWeightKg] = useState(62);
  const [goal, setGoal] = useState("");
  const [mainProblem, setMainProblem] = useState<
    | "barriga-inchada"
    | "fome-descontrolada"
    | "energia-baixa"
    | "sono-fraco"
    | "stress-alto"
    | "pos-parto"
    | "menopausa"
  >("barriga-inchada");
  const [quiz, setQuiz] = useState<Record<QuizKey, number>>({
    sleepDifficulty: 3,
    digestiveDiscomfort: 3,
    stressLevel: 3,
    afternoonEnergyDip: 3,
    mealRegularity: 3,
    hydrationConsistency: 3,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setQuizAnswer(key: QuizKey, value: number) {
    setQuiz((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/user/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age,
        heightCm,
        weightKg,
        goalWeightKg,
        goal,
        mainProblem,
        quiz,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível guardar.");
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pg-onboarding-quiz-v1", JSON.stringify(quiz));
      window.dispatchEvent(new CustomEvent("pg-radar-refresh"));
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="glass-panel space-y-4 rounded-3xl p-6"
      suppressHydrationWarning
    >
      <div className="grid grid-cols-2 gap-3" suppressHydrationWarning>
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Idade</label>
          <input
            type="number"
            className="pg-input"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Altura (cm)</label>
          <input
            type="number"
            step="1"
            className="pg-input"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            required
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Problema principal</label>
        <select
          className="pg-input"
          value={mainProblem}
          onChange={(e) =>
            setMainProblem(
              e.target.value as
                | "barriga-inchada"
                | "fome-descontrolada"
                | "energia-baixa"
                | "sono-fraco"
                | "stress-alto"
                | "pos-parto"
                | "menopausa",
            )
          }
        >
          <option value="barriga-inchada">Barriga inchada</option>
          <option value="fome-descontrolada">Fome descontrolada</option>
          <option value="energia-baixa">Energia baixa</option>
          <option value="sono-fraco">Sono fraco</option>
          <option value="stress-alto">Stress alto</option>
          <option value="pos-parto">Pós-parto</option>
          <option value="menopausa">Menopausa</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3" suppressHydrationWarning>
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            className="pg-input"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Meta de peso (kg)</label>
          <input
            type="number"
            step="0.1"
            className="pg-input"
            value={goalWeightKg}
            onChange={(e) => setGoalWeightKg(Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Objetivo</label>
        <textarea
          className="pg-input min-h-24 resize-none"
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Perder gordura abdominal com consistência"
          required
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Quiz de personalização</p>
        <p className="mt-1 text-xs text-neutral-600">
          Responde rápido (1 a 5) para montarmos o teu estudo inicial e ligar tudo ao gráfico.
        </p>
        <div className="mt-3 space-y-3">
          {QUIZ_QUESTIONS.map((q) => (
            <div key={q.key} className="rounded-2xl border border-rose-100 bg-white/70 p-3">
              <p className="text-sm font-medium text-neutral-800">{q.label}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{q.hint}</p>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = quiz[q.key] === n;
                  return (
                    <button
                      key={`${q.key}-${n}`}
                      type="button"
                      onClick={() => setQuizAnswer(q.key, n)}
                      className={`h-8 w-8 rounded-full border text-xs font-semibold transition ${
                        active
                          ? "border-pg-berry bg-pg-berry text-white"
                          : "border-rose-100 bg-white text-neutral-700"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <PrimaryButton type="submit" className="w-full" disabled={loading}>
        {loading ? "A guardar..." : "Continuar para o dashboard"}
      </PrimaryButton>
    </form>
  );
}
