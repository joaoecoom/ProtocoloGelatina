import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ebookAccess, effectivePlanForAccess } from "@/lib/plans";
import { ebooks } from "@/lib/content/ebooks";
import { GlassCard } from "@/components/glass-card";

export default async function EbooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Biblioteca</p>
        <h1 className="font-display text-2xl font-semibold text-pg-ink">Ebooks</h1>
        <p className="mt-1 text-sm text-pg-forest/75">Guias rápidos para aplicares no ritual de hoje.</p>
      </div>
      <div className="space-y-3">
        {ebooks.map((book) => {
          const access = ebookAccess(effectivePlanForAccess(user), book.slug);
          const label =
            access === "full" ? "Completo" : access === "preview" ? "Pré-visualização" : "Bloqueado";
          return (
            <Link key={book.slug} href={`/ebooks/${book.slug}`}>
              <GlassCard className="transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                      Ebook
                    </p>
                    <h2 className="text-lg font-semibold text-neutral-900">{book.title}</h2>
                    <p className="mt-2 text-sm text-neutral-600">{book.description}</p>
                    <p className="mt-3 text-xs font-semibold text-pg-forest/70">Próximo passo: abrir ebook</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold text-rose-500">
                    {label}
                  </span>
                </div>
              </GlassCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
