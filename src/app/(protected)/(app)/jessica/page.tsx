import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { effectivePlanForAccess, jessicaConfig } from "@/lib/plans";
import { JessicaChatShell } from "./jessica-chat-shell";

export default async function JessicaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const accessPlan = effectivePlanForAccess(user);
  const cfg = jessicaConfig(accessPlan);
  const cap = Number.isFinite(cfg.dailyCap) ? cfg.dailyCap : ("∞" as const);

  return (
    <div className="space-y-4 pb-8" suppressHydrationWarning>
      <div suppressHydrationWarning>
        <p className="pg-kicker">Acompanhamento</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Falar com a Jéssica</h1>
        <p className="mt-1.5 text-sm font-medium text-pg-forest/70">
          Respostas orientadas ao teu plano. Pergunta o que precisares.
        </p>
      </div>
      <JessicaChatShell plan={accessPlan} initialCap={cap} />
    </div>
  );
}
