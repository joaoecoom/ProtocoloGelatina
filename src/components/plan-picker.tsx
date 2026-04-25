"use client";

import { useState } from "react";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";
import { PrimaryButton } from "@/components/primary-button";
import { GlassCard } from "@/components/glass-card";
import { LogoutButton } from "@/components/logout-button";

const planIds = Object.keys(PLAN_CATALOG) as PlanId[];

export function PlanPicker({ current }: { current: PlanId }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  async function choose(plan: PlanId) {
    setLoadingPlan(plan);
    setStatus(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error ?? "Não foi possível iniciar o checkout.");
      setLoadingPlan(null);
      return;
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) {
      setStatus("Sessão de checkout inválida.");
      setLoadingPlan(null);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="space-y-4">
      {planIds.map((id) => {
        const meta = PLAN_CATALOG[id];
        const active = id === current;
        return (
          <GlassCard key={id} className={active ? "ring-2 ring-[#27AE60]/40" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                  Plano
                </p>
                <h2 className="text-lg font-semibold text-neutral-900">{meta.label}</h2>
                <p className="mt-2 text-sm text-neutral-600">{meta.description}</p>
                <p className="mt-3 text-sm font-semibold text-neutral-900">
                  Trial {meta.trialEuro.toFixed(2)} € · {meta.monthlyEuro.toFixed(2)} € / mês
                </p>
              </div>
            </div>
            <PrimaryButton
              type="button"
              className="mt-4 w-full"
              variant={active ? "ghost" : "green"}
              disabled={active || loadingPlan !== null}
              onClick={() => void choose(id)}
            >
              {active ? "Atual" : loadingPlan === id ? "A abrir checkout..." : "Ativar plano"}
            </PrimaryButton>
          </GlassCard>
        );
      })}
      {status ? <p className="text-center text-sm text-emerald-700">{status}</p> : null}
      <LogoutButton className="w-full" />
    </div>
  );
}
