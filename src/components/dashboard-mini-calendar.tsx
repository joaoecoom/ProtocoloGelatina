"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

function parseLocalNoon(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toYmd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 7 datas da semana (seg a dom) que contém `anchorYmd` */
function weekContaining(anchorYmd: string) {
  const d = parseLocalNoon(anchorYmd);
  const dow = d.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d);
  start.setDate(d.getDate() + toMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return { date: x, iso: toYmd(x) };
  });
}

type MonthGridProps = {
  viewY: number;
  viewM0: number;
  highlightDate: string;
  planMarks?: Record<string, { colors: string[]; done?: boolean }>;
  onPrev: () => void;
  onNext: () => void;
  monthLabel: string;
};

function MonthGrid({
  viewY,
  viewM0,
  highlightDate,
  planMarks,
  onPrev,
  onNext,
  monthLabel,
}: MonthGridProps) {
  const { cells } = useMemo(() => {
    const first = new Date(viewY, viewM0, 1);
    const lastDay = new Date(viewY, viewM0 + 1, 0).getDate();
    const mondayOffset = (first.getDay() + 6) % 7;
    const cellList: (number | null)[] = [];
    for (let i = 0; i < mondayOffset; i += 1) cellList.push(null);
    for (let d = 1; d <= lastDay; d += 1) cellList.push(d);
    while (cellList.length % 7 !== 0) cellList.push(null);
    return { cells: cellList };
  }, [viewY, viewM0]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-pg-forest transition hover:bg-pg-mint/80"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-pg-ink">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-pg-forest transition hover:bg-pg-mint/80"
          aria-label="Mês seguinte"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[8px] font-semibold leading-tight text-pg-forest/55 sm:text-[9px]">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-0.5">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-0.5 grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day == null) {
            return <div key={`e-${i}`} className="min-h-8" aria-hidden />;
          }
          const ymd = toYmd(new Date(viewY, viewM0, day));
          const isHighlight = ymd === highlightDate;
          const mark = planMarks?.[ymd];
          return (
            <div key={ymd} className="flex min-h-8 items-center justify-center p-0.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    isHighlight
                      ? "bg-pg-forest text-white shadow-sm"
                      : mark?.done
                        ? "bg-pg-mint text-pg-forest"
                        : "text-pg-ink/85",
                  )}
                  aria-current={isHighlight ? "date" : undefined}
                >
                  {day}
                </span>
                {mark?.colors?.length ? (
                  <div className="mt-0.5 flex max-w-8 flex-wrap justify-center gap-0.5">
                    {mark.colors.slice(0, 3).map((c) => (
                      <span key={`${ymd}-${c}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

type Props = {
  /** Dia a destacar (normalmente o «hoje» da app, YYYY-MM-DD) */
  highlightDate: string;
  planMarks?: Record<string, { colors: string[]; done?: boolean }>;
  className?: string;
};

/**
 * Só a semana (1 linha); toque = abre o mês.
 */
export function DashboardMiniCalendar({ highlightDate, planMarks, className }: Props) {
  const anchor = useMemo(() => parseLocalNoon(highlightDate), [highlightDate]);
  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(anchor.getFullYear());
  const [viewM0, setViewM0] = useState(anchor.getMonth());

  const week = useMemo(() => weekContaining(highlightDate), [highlightDate]);
  const monthLabel = new Date(viewY, viewM0, 1).toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  const goMonth = (delta: number) => {
    const d = new Date(viewY, viewM0 + delta, 1);
    setViewY(d.getFullYear());
    setViewM0(d.getMonth());
  };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className={cn("glass-panel rounded-3xl p-3 sm:p-4", className)}>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-pg-rose-muted">
          Esta semana
        </p>
        <div className="mt-2 grid grid-cols-7 gap-0.5 sm:gap-1">
          {week.map(({ date, iso }, i) => {
            const isToday = iso === highlightDate;
            const label = WEEKDAY_LABELS[i];
            const mark = planMarks?.[iso];
            return (
              <div key={iso} className="text-center">
                <div className="text-[8px] font-semibold text-pg-forest/50 sm:text-[9px]">{label}</div>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="mt-1 w-full"
                  aria-label={`Abrir calendário, dia ${date.getDate()}`}
                >
                  <div className="mx-auto flex flex-col items-center">
                    <div
                      className={cn(
                        "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums sm:h-10 sm:w-10",
                        isToday
                          ? "bg-pg-forest text-white shadow-md"
                          : mark?.done
                            ? "bg-pg-mint text-pg-forest"
                            : "text-pg-ink/75 hover:bg-pg-mint/60",
                      )}
                      aria-current={isToday ? "date" : undefined}
                    >
                      {date.getDate()}
                    </div>
                    {mark?.colors?.length ? (
                      <div className="mt-0.5 flex justify-center gap-0.5">
                        {mark.colors.slice(0, 3).map((c) => (
                          <span key={`${iso}-${c}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 w-full text-center text-xs font-semibold text-pg-berry/90 hover:underline"
        >
          Ver mês
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-label="Calendário"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-white/20 bg-pg-cream/95 p-4 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-pg-ink">Calendário</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-sm font-medium text-pg-forest/70 hover:bg-pg-mint/80"
              >
                Fechar
              </button>
            </div>
            <MonthGrid
              viewY={viewY}
              viewM0={viewM0}
              highlightDate={highlightDate}
              planMarks={planMarks}
              onPrev={() => goMonth(-1)}
              onNext={() => goMonth(1)}
              monthLabel={monthLabel}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
