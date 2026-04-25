"use client";

import { useMemo, useState } from "react";
import {
  PROTOCOL_PLAN_TEMPLATES,
  activateProtocolPlan,
  deactivateProtocolPlan,
  readActiveProtocolPlans,
  syncProtocolPlansStateToServer,
  type ProtocolPlanCategory,
} from "@/lib/protocol-plans";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";

export function ProtocolPlanManager({ category }: { category: ProtocolPlanCategory }) {
  const plans = useMemo(
    () => PROTOCOL_PLAN_TEMPLATES.filter((p) => p.category === category),
    [category],
  );
  const [activeIds, setActiveIds] = useState(() => new Set(readActiveProtocolPlans().map((p) => p.id)));
  const [message, setMessage] = useState<string | null>(null);

  function toggle(planId: string) {
    const selected = plans.find((p) => p.id === planId);
    if (!selected) return;
    const isActive = activeIds.has(planId);
    if (isActive) {
      const next = deactivateProtocolPlan(planId);
      setActiveIds(new Set(next.map((p) => p.id)));
      setMessage("Plano removido do acompanhamento.");
      void syncProtocolPlansStateToServer();
      return;
    }
    const next = activateProtocolPlan(selected);
    setActiveIds(new Set(next.map((p) => p.id)));
    setMessage("Plano ativado e pronto para aparecer no calendário.");
    void syncProtocolPlansStateToServer();
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const active = activeIds.has(plan.id);
        return (
          <GlassCard key={plan.id} className={active ? "ring-2 ring-pg-berry/30" : ""}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-pg-rose-muted">
                  {plan.durationDays} dias · {String(plan.recommendedHour).padStart(2, "0")}:00
                </p>
                <h2 className="mt-1 text-base font-semibold text-pg-ink">{plan.title}</h2>
                <p className="mt-1 text-sm text-pg-forest/80">{plan.description}</p>
              </div>
              <span
                className="mt-1 h-3 w-3 rounded-full"
                style={{ backgroundColor: plan.color }}
                aria-label={`Cor do plano ${plan.title}`}
              />
            </div>
            <PrimaryButton
              type="button"
              variant={active ? "ghost" : "rose"}
              className="mt-4 w-full py-2 text-sm"
              onClick={() => toggle(plan.id)}
            >
              {active ? "Remover plano" : "Ativar plano"}
            </PrimaryButton>
          </GlassCard>
        );
      })}
      {message ? <p className="text-center text-xs text-pg-forest/80">{message}</p> : null}
    </div>
  );
}
