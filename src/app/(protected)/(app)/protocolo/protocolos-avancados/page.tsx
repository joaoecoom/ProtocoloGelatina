import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { ProtocolPlanManager } from "@/components/protocol-plan-manager";

export default function ProtocolosAvancadosPage() {
  return (
    <div className="space-y-4 pb-6">
      <GlassCard>
        <p className="pg-kicker">Protocolos avançados</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-pg-ink">Escolhe os teus planos</h1>
        <p className="mt-2 text-sm text-pg-forest/80">
          Podes ativar vários em simultâneo. Cada plano ativo aparece no calendário com cor própria.
        </p>
      </GlassCard>

      <ProtocolPlanManager category="advanced" />

      <Link href="/protocolo" className="inline-flex text-sm font-semibold text-pg-forest-light hover:underline">
        ← Voltar ao protocolo
      </Link>
    </div>
  );
}
