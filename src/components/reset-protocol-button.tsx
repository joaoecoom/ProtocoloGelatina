"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetProtocolButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function clearLocalActivityState() {
    if (typeof window === "undefined") return;
    const keysToRemoveExact = new Set([
      "pg-active-protocol-plans-v1",
      "pg-plan-checkins-v1",
      "pg-radar-pulse-v1",
      "pg-radar-snapshot-v1",
      "pg-onboarding-quiz-v1",
    ]);
    const prefixes = ["pg-slot-", "pg-notif-", "pg-plan-notif-", "pg-nudge-"];

    const allKeys = Object.keys(window.localStorage);
    for (const key of allKeys) {
      if (keysToRemoveExact.has(key) || prefixes.some((p) => key.startsWith(p))) {
        window.localStorage.removeItem(key);
      }
    }
    window.dispatchEvent(new CustomEvent("pg-radar-refresh"));
  }

  async function onReset() {
    const ok = window.confirm(
      "Isto reinicia toda a tua atividade: histórico diário, planos ativos, registos, chat e progresso. Voltas ao onboarding/tutorial como na primeira utilização (a conta mantém-se). Queres continuar?",
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/user/reset-protocol", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erro ao reiniciar.");
        return;
      }
      clearLocalActivityState();
      setDone(true);
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Ligação falhou. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => void onReset()}
        disabled={loading}
        className="w-full max-w-xs rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {loading ? "A reiniciar…" : "Reiniciar toda a atividade"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {done ? <p className="mt-2 text-sm font-medium text-[#27AE60]">Atividade reiniciada. Vamos recomeçar.</p> : null}
    </div>
  );
}
