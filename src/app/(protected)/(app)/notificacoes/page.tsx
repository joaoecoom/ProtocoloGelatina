import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { GlassCard } from "@/components/glass-card";

export default async function NotificacoesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Alertas</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Notificações</h1>
        <p className="mt-1 text-sm text-pg-forest/75">Acompanha lembretes úteis para não perder o ritmo.</p>
      </div>
      <GlassCard>
        <p className="text-xs font-bold uppercase tracking-wide text-pg-berry">Exemplos de alertas</p>
        <ul className="mt-3 space-y-2 text-sm text-pg-forest/85">
          <li>Ritual de hoje por concluir.</li>
          <li>Faltam 2 dias para terminares a fase.</li>
          <li>Nova receita desbloqueada no protocolo.</li>
        </ul>
      </GlassCard>
      <GlassCard className="border border-pg-forest/10 bg-pg-mint/30">
        <p className="text-xs font-bold uppercase tracking-wide text-pg-berry">Estado atual</p>
        <p className="mt-2 text-sm text-pg-forest/80">
          Ainda não tens notificações novas. Assim que ativares as permissões no teu browser, vais receber lembretes
          de horário e progresso.
        </p>
        <Link
          href="/configuracoes"
          className="pg-cta-forest mt-3 inline-flex h-10 items-center justify-center rounded-full px-4 text-xs"
        >
          Ativar notificações
        </Link>
      </GlassCard>
      <Link
        href="/app"
        className="text-sm font-semibold text-pg-berry/90 decoration-pg-berry/20 underline-offset-4 hover:underline"
      >
        ← Voltar ao início
      </Link>
    </div>
  );
}
