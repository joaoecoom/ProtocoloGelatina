import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { ProtocolPlanManager } from "@/components/protocol-plan-manager";

export default function PlanosDeUsoPage() {
  return (
    <div className="space-y-4 pb-6">
      <GlassCard>
        <p className="pg-kicker">Planos de uso</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-pg-ink">Melhores horas para tomar</h1>
        <p className="mt-2 text-sm text-pg-forest/80">
          Ativa o plano para receber lembretes na hora certa e acompanhar no calendário.
        </p>
      </GlassCard>

      <ProtocolPlanManager category="usage" />

      <Link href="/protocolo" className="inline-flex text-sm font-semibold text-pg-forest-light hover:underline">
        ← Voltar ao protocolo
      </Link>
    </div>
  );
}
