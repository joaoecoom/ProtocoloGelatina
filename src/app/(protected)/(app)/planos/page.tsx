import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PlanPicker } from "@/components/plan-picker";

export default async function PlanosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Planos</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Desbloqueia novos protocolos</h1>
        <p className="mt-1 text-sm text-pg-forest/75">
          Mostramos apenas os módulos que ainda não tens ativos, com compra direta dentro da app.
        </p>
      </div>
      <PlanPicker current={user.plan} />
    </div>
  );
}
