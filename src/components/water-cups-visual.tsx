"use client";

/**
 * Copos com «água» visível (enchimento) — cada unidade = 1 copo completo.
 */
export function WaterCupsVisual({ count, maxCups = 8 }: { count: number; maxCups?: number }) {
  const n = Math.max(0, count);
  const show = Math.min(n, maxCups);
  const extra = n > maxCups ? n - maxCups : 0;

  return (
    <div
      className="flex min-h-16 flex-wrap items-end justify-center gap-2.5 sm:gap-3"
      aria-label={`${n} copos de água`}
    >
      {Array.from({ length: show }, (_, i) => (
        <WaterCup key={i} index={i} />
      ))}
      {extra > 0 ? (
        <span className="mb-2 text-sm font-bold tabular-nums text-pg-forest/80">+{extra}</span>
      ) : null}
    </div>
  );
}

function WaterCup({ index }: { index: number }) {
  return (
    <div
      className="relative h-16 w-9 overflow-hidden rounded-b-[0.6rem] rounded-t border-2 border-sky-200/80 bg-gradient-to-b from-white/40 to-sky-50/30 shadow-[0_2px_8px_-2px_rgba(12,97,150,0.2)]"
      style={{ transform: `rotate(${(index % 3) - 1}deg)` }}
    >
      {/* Água */}
      <div
        className="absolute inset-x-0.5 bottom-0.5 top-[8%] overflow-hidden rounded-b-md rounded-t-sm"
        aria-hidden
      >
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-gradient-to-b from-cyan-300/95 via-sky-400/95 to-sky-600/90"
          style={{ height: "86%" }}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 to-transparent"
          aria-hidden
        />
        {/* brilho simples no topo do líquido */}
        <div
          className="absolute left-0.5 right-0.5 top-[6%] h-0.5 rounded-full bg-white/50"
          aria-hidden
        />
      </div>
    </div>
  );
}
