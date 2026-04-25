import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { shopProducts } from "@/lib/content/shop";
import { GlassCard } from "@/components/glass-card";

export default async function LojaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  return (
    <div className="space-y-5 pb-8">
      <div>
        <p className="pg-kicker">Loja</p>
        <h1 className="font-display text-2xl font-semibold text-pg-ink">Produtos para acelerar resultados</h1>
        <p className="mt-1 text-sm text-pg-forest/75">Escolhas simples, focadas em digestão, energia e consistência.</p>
      </div>
      <div className="space-y-3">
        {shopProducts.map((p) => (
          <GlassCard key={p.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">Produto</p>
                <h2 className="text-lg font-semibold text-neutral-900">{p.title}</h2>
                <p className="mt-2 text-sm text-neutral-600">{p.description}</p>
                <p className="mt-2 text-sm font-semibold text-[#27AE60]">
                  {p.priceEuro.toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={p.affiliateUrl}
                className="inline-flex rounded-full bg-[#27AE60] px-4 py-2 text-xs font-semibold text-white"
              >
                Ver produto
              </Link>
              {p.hasVsl ? (
                <span className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-600">
                  VSL interna disponível
                </span>
              ) : null}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
