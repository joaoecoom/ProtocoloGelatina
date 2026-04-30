import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PLAN_CATALOG, effectivePlanForAccess } from "@/lib/plans";
import { GlassCard } from "@/components/glass-card";
import { ProfilePhoto } from "@/components/profile-photo";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const planMeta = PLAN_CATALOG[user.plan];
  const accessPlan = effectivePlanForAccess(user);
  const accessLabel = PLAN_CATALOG[accessPlan]?.label ?? accessPlan;

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Conta</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Perfil</h1>
        <p className="mt-2 text-sm text-pg-forest/75">Dados da tua conta, plano e progresso atual.</p>
      </div>

      <GlassCard>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Nome</dt>
            <dd className="mt-0.5 font-medium text-pg-ink">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Email</dt>
            <dd className="mt-0.5 text-pg-ink/90">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Plano subscrito</dt>
            <dd className="mt-0.5 text-pg-ink/90">{planMeta?.label ?? user.plan}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Acesso aos conteúdos</dt>
            <dd className="mt-0.5 text-pg-ink/90">
              {user.isSuperAdmin ? (
                <>
                  <span className="font-medium text-amber-700">Super admin</span>
                  <span className="text-neutral-600"> — experiência como «{accessLabel}».</span>
                </>
              ) : (
                <span>{accessLabel}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Peso registado</dt>
            <dd className="mt-0.5 text-pg-ink/90">
              {user.weightKg != null ? `${user.weightKg} kg` : "—"}
              <span className="ml-2 text-xs text-pg-forest/55">(atualiza no Início)</span>
            </dd>
          </div>
        </dl>

        <ProfilePhoto displayName={user.name} avatarUrl={user.avatarUrl} />

        <Link
          href="/planos"
          className="mt-5 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
        >
          Ver ou alterar plano →
        </Link>
      </GlassCard>

      <Link href="/app" className="text-sm font-semibold text-rose-500 hover:underline">
        ← Voltar ao início
      </Link>
    </div>
  );
}
