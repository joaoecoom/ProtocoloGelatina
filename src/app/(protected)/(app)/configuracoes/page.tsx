import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { GlassCard } from "@/components/glass-card";
import { LogoutButton } from "@/components/logout-button";
import { ResetProtocolButton } from "@/components/reset-protocol-button";
import { NotificationSettingsCard } from "@/components/notification-settings-card";

export default async function ConfiguracoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Conta</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Configurações</h1>
        <p className="mt-2 text-sm text-pg-forest/75">Conta, notificações, progresso e sessão num só lugar.</p>
      </div>

      <GlassCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Conta</p>
        <p className="mt-1 text-sm text-pg-forest/80">Gerir preferências essenciais da tua conta e do teu ritual.</p>

        <div className="mt-5 border-t border-rose-100/80 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Progresso</p>
          <p className="mt-1 text-sm text-pg-forest/80">
            Reinicia toda a tua atividade e volta ao fluxo de primeira utilização: onboarding, tutorial e perguntas
            iniciais para recalibrar o gráfico. A conta mantém-se.
          </p>
          <ResetProtocolButton />
        </div>

        <div className="mt-5 border-t border-rose-100/80 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Sessão</p>
          <p className="mt-1 text-sm text-pg-forest/80">Sai deste dispositivo. Precisas do email e password para voltar a entrar.</p>
          <LogoutButton className="mt-4 w-full max-w-xs" />
        </div>
      </GlassCard>

      <NotificationSettingsCard />

      <Link href="/dashboard" className="text-sm font-semibold text-rose-500 hover:underline">
        ← Voltar ao início
      </Link>
    </div>
  );
}
