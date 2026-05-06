"use client";

import { useState } from "react";

type FunnelAiPayload = {
  generatedAt: string;
  filters: Record<string, unknown>;
  totals: Record<string, unknown>;
  leadMetrics: Record<string, unknown>;
  stageLosses: Array<Record<string, unknown>>;
  topStepLosses: Array<Record<string, unknown>>;
};

export function FunnelAiPanel({ payload }: { payload: FunnelAiPayload }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quizdashboard/metrics/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload }),
      });
      const data = (await res.json()) as { analysis?: string; error?: string };
      if (!res.ok || !data.analysis) {
        setError(data.error ?? "Falha ao gerar análise.");
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      setError("Erro de rede ao pedir análise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm lg:col-span-2">
      <details>
        <summary className="cursor-pointer list-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-pg-ink">
          Expandir IA do funil (detetar buracos e prioridades)
        </summary>
        <div className="mt-3">
          <p className="text-xs text-pg-ink/70">
            A IA lê as métricas atuais e devolve os principais pontos de fuga, hipótese de causa e próximas ações.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={loading}
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "A analisar..." : "Analisar agora"}
            </button>
            {analysis ? <span className="text-xs text-emerald-700">Análise atualizada.</span> : null}
          </div>
          {error ? <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          {analysis ? (
            <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-violet-100 bg-white p-3 text-sm leading-relaxed text-pg-ink">
              {analysis}
            </pre>
          ) : (
            <p className="mt-3 text-sm text-pg-ink/65">Ainda sem análise. Clica em “Analisar agora”.</p>
          )}
        </div>
      </details>
    </div>
  );
}
