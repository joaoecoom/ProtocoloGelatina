import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { GlassCard } from "@/components/glass-card";

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (!user.isSuperAdmin) redirect("/app");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-600">Super admin</p>
        <h1 className="font-display mt-1 text-2xl font-semibold text-pg-ink">Controlo da app</h1>
        <p className="mt-2 text-sm text-pg-forest/75">
          Acesso reservado a contas com <strong>super admin</strong>. Aqui tens o mapa do que podes gerir hoje e o que
          falta integrar (ex.: CMS de vídeos).
        </p>
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold text-neutral-900">Vídeos dos cursos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Os IDs Vimeo e a estrutura dos módulos vivem no código em{" "}
          <code className="rounded bg-rose-50 px-1.5 py-0.5 text-xs">src/lib/content/courses.ts</code>. Para
          trocar um vídeo, altera o <code className="text-xs">vimeoId</code> da lição e faz deploy.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Próximo passo (se quiseres): painel que grave na base ou no Storage em vez de editar ficheiros — diz e
          desenhamos o modelo.
        </p>
        <Link
          href="/cursos"
          className="mt-4 inline-flex text-sm font-semibold text-[#27AE60] underline-offset-4 hover:underline"
        >
          Ver cursos na app →
        </Link>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-neutral-900">Contas e planos</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Utilizadores e auth estão no <strong>Supabase Dashboard</strong> (Authentication). O plano comercial e{" "}
          <code className="text-xs">isSuperAdmin</code> estão na tabela Prisma <code className="text-xs">User</code>.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Script local: <code className="text-xs">npm run user:create</code> (ver <code className="text-xs">scripts/create-user.ts</code>
          ).
        </p>
      </GlassCard>

      <GlassCard>
        <h2 className="text-lg font-semibold text-neutral-900">O que o super admin já faz na app</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
          <li>Acesso a todo o conteúdo como plano máximo (cursos, ebooks, protocolo, Jéssica).</li>
          <li>Indicador <strong>Admin</strong> no cabeçalho e atalho para esta página.</li>
        </ul>
      </GlassCard>

      <Link href="/app" className="text-sm font-semibold text-rose-500 hover:underline">
        ← Voltar ao início
      </Link>
    </div>
  );
}
