import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { shoppingList } from "@/lib/content/gelatinas";

export default function ListaDeComprasPage() {
  return (
    <div className="space-y-4 pb-6">
      <GlassCard>
        <p className="pg-kicker">Lista de compras</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-pg-ink">Essenciais da semana</h1>
        <ul className="mt-3 space-y-2 text-sm text-pg-forest/85">
          {shoppingList.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </GlassCard>
      <Link href="/protocolo" className="inline-flex text-sm font-semibold text-pg-forest-light hover:underline">
        ← Voltar ao protocolo
      </Link>
    </div>
  );
}
