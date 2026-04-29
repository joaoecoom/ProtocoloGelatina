"use client";

import { useState } from "react";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";
import { PrimaryButton } from "@/components/primary-button";
import { GlassCard } from "@/components/glass-card";
import { LogoutButton } from "@/components/logout-button";

type OfferItem = {
  id: string;
  title: string;
  subtitle: string;
  blurb: string;
  displayPrice: string;
  planToBuy?: PlanId;
  tone: "rose" | "emerald" | "amber";
  locked?: boolean;
};

const UP1_PLANS: PlanId[] = ["UPSELL_1", "DS1_UP1", "DS2_UP1", "DS3_UP1"];
const UP2_PLANS: PlanId[] = ["UPSELL_2", "DS1_UP2", "DS2_UP2", "DS3_UP2"];

function hasUp1(current: PlanId) {
  return UP1_PLANS.includes(current) || UP2_PLANS.includes(current);
}

function hasUp2(current: PlanId) {
  return UP2_PLANS.includes(current);
}

export function PlanPicker({ current }: { current: PlanId }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const unlockedFront = current === "FRONT" || hasUp1(current) || hasUp2(current);
  const unlockedUp1 = hasUp1(current);
  const unlockedUp2 = hasUp2(current);

  const coreOffers: OfferItem[] = [
    {
      id: "front",
      title: "Protocolo Gelatina Inteligente",
      subtitle: "Oferta base",
      blurb: "Base completa diária para desinchar, controlar fome e manter ritmo.",
      displayPrice: `Trial ${PLAN_CATALOG.FRONT.trialEuro.toFixed(2)} € · ${PLAN_CATALOG.FRONT.monthlyEuro.toFixed(2)} € / mês`,
      planToBuy: "FRONT",
      tone: "rose",
      locked: unlockedFront,
    },
    {
      id: "up1",
      title: "Protocolo do Chá Bariátrico",
      subtitle: "Aceleração",
      blurb: "Módulo complementar para acelerar resultados e reduzir inchaço mais rápido.",
      displayPrice: `Trial ${PLAN_CATALOG.UPSELL_1.trialEuro.toFixed(2)} € · ${PLAN_CATALOG.UPSELL_1.monthlyEuro.toFixed(2)} € / mês`,
      planToBuy: "UPSELL_1",
      tone: "emerald",
      locked: unlockedUp1,
    },
    {
      id: "up2",
      title: "Protocolo Anti-Platô Metabólico",
      subtitle: "Continuidade",
      blurb: "Estratégia para destravar quando a balança abranda e manter progresso.",
      displayPrice: `Trial ${PLAN_CATALOG.UPSELL_2.trialEuro.toFixed(2)} € · ${PLAN_CATALOG.UPSELL_2.monthlyEuro.toFixed(2)} € / mês`,
      planToBuy: "UPSELL_2",
      tone: "amber",
      locked: unlockedUp2,
    },
  ];

  const miniOffers: OfferItem[] = [
    {
      id: "mini-receitas",
      title: "Receitas Exclusivas",
      subtitle: "Mini-protocolo",
      blurb: "Novas combinações com segredos de execução para acelerar consistência.",
      displayPrice: "A partir de 2,99 €",
      planToBuy: "DS2_UP1",
      tone: "rose",
    },
    {
      id: "mini-aceleracao",
      title: "Protocolos de Aceleração",
      subtitle: "Mini-protocolo",
      blurb: "Blocos de 7 dias para resultados visíveis mais rapidamente.",
      displayPrice: "A partir de 3,99 €",
      planToBuy: "DS1_UP1",
      tone: "emerald",
    },
    {
      id: "mini-estrategias",
      title: "Estratégias de Continuidade",
      subtitle: "Mini-protocolo",
      blurb: "Planos de ajuste para manter o peso sob controlo sem estagnar.",
      displayPrice: "A partir de 5,99 €",
      planToBuy: "DS1_UP2",
      tone: "amber",
    },
  ];

  async function chooseOneClick(plan: PlanId) {
    setLoadingPlan(plan);
    setStatus(null);
    const res = await fetch("/api/stripe/offer-charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setStatus(data.error ?? "Não foi possível desbloquear automaticamente.");
      setLoadingPlan(null);
      return;
    }
    setStatus("Desbloqueado com sucesso. O módulo já está ativo na tua conta.");
    window.location.reload();
  }

  const availableCoreOffers = coreOffers.filter((o) => !o.locked);
  const lockedCoreOffers = coreOffers.filter((o) => o.locked);

  return (
    <div className="space-y-4">
      <GlassCard className="bg-white/85">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pg-rose-muted">
          Teu plano atual
        </p>
        <h2 className="mt-1 text-lg font-semibold text-neutral-900">{PLAN_CATALOG[current].label}</h2>
        <p className="mt-1 text-sm text-neutral-600">{PLAN_CATALOG[current].description}</p>
      </GlassCard>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pg-rose-muted">
          Ofertas para desbloquear
        </p>
        {availableCoreOffers.length === 0 ? (
          <GlassCard className="mt-2 bg-emerald-50/60 ring-1 ring-emerald-200">
            <p className="text-sm font-semibold text-emerald-800">
              Já tens os módulos principais desbloqueados. Excelente!
            </p>
          </GlassCard>
        ) : (
          <div className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2">
            {availableCoreOffers.map((offer) => (
              <GlassCard
                key={offer.id}
                className="min-w-[280px] snap-start border border-neutral-200 bg-white/95"
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    offer.tone === "rose"
                      ? "text-rose-500"
                      : offer.tone === "emerald"
                        ? "text-emerald-600"
                        : "text-amber-600"
                  }`}
                >
                  {offer.subtitle}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-neutral-900">{offer.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{offer.blurb}</p>
                <p className="mt-3 text-sm font-semibold text-neutral-900">{offer.displayPrice}</p>
                <PrimaryButton
                  type="button"
                  className="mt-4 w-full"
                  variant="green"
                  disabled={loadingPlan !== null}
                  onClick={() => offer.planToBuy && void chooseOneClick(offer.planToBuy)}
                >
                  {loadingPlan === offer.planToBuy ? "A desbloquear..." : "Clique aqui para desbloquear"}
                </PrimaryButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {lockedCoreOffers.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pg-rose-muted">
            Já desbloqueados
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {lockedCoreOffers.map((offer) => (
              <GlassCard key={offer.id} className="border border-emerald-200 bg-emerald-50/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Módulo ativo</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-900">{offer.title}</h3>
              </GlassCard>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pg-rose-muted">
          Mini protocolos e extras
        </p>
        <div className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2">
          {miniOffers.map((offer) => (
            <GlassCard key={offer.id} className="min-w-[260px] snap-start border border-neutral-200 bg-white/95">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  offer.tone === "rose"
                    ? "text-rose-500"
                    : offer.tone === "emerald"
                      ? "text-emerald-600"
                      : "text-amber-600"
                }`}
              >
                {offer.subtitle}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-900">{offer.title}</h3>
              <p className="mt-2 text-sm text-neutral-600">{offer.blurb}</p>
              <p className="mt-3 text-sm font-semibold text-neutral-900">{offer.displayPrice}</p>
              <PrimaryButton
                type="button"
                className="mt-4 w-full"
                variant="ghost"
                disabled={loadingPlan !== null || !offer.planToBuy}
                onClick={() => offer.planToBuy && void chooseOneClick(offer.planToBuy)}
              >
                {loadingPlan === offer.planToBuy ? "A desbloquear..." : "Clique aqui para desbloquear"}
              </PrimaryButton>
            </GlassCard>
          ))}
        </div>
      </div>
      {status ? <p className="text-center text-sm text-emerald-700">{status}</p> : null}
      <LogoutButton className="w-full" />
    </div>
  );
}
