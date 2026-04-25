import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { commonMistakes } from "@/lib/content/gelatinas";

export default function ErrosComunsPage() {
  return (
    <div className="space-y-4 pb-6">
      <GlassCard>
        <p className="pg-kicker">Erros comuns</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-pg-ink">Evita estes bloqueios</h1>
        <ul className="mt-3 space-y-2 text-sm text-pg-forest/85">
          {commonMistakes.map((item) => (
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
