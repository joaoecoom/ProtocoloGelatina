"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  {
    href: "/dashboard",
    label: "Início",
    icon: () => (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 9.5 12 2l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/protocolo",
    label: "Protocolo",
    icon: () => (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 4h-4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
        <path d="M9 4h4l5 3v10l-5 3H9" />
        <path d="M7 8h.01M7 12h.01M7 16h.01" />
      </svg>
    ),
  },
  {
    href: "/jessica",
    label: "Jéssica",
    icon: () => (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 7v2M8 10h2a2 2 0 0 0 2 2v.5a1.5 1.5 0 0 0 1.5 1.5H16M9.5 17H14" />
        <path d="M8 3v3M16 3v3" />
      </svg>
    ),
  },
  {
    href: "/planos",
    label: "Planos",
    icon: () => (
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1H4v-1Z" />
        <path d="M2 12v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" />
        <path d="M6 20v-4" />
        <path d="M10 20v-4" />
        <path d="M14 20v-4" />
        <path d="M18 20v-4" />
        <path d="M8 2v2M12 2v2M16 2v2" />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-pg-forest/6 bg-white/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60"
      suppressHydrationWarning
    >
      <div
        className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1 py-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))]"
        suppressHydrationWarning
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold uppercase tracking-tight",
                active
                  ? "bg-pg-mint/90 text-pg-forest shadow-[inset_0_0_0_1px_rgba(27,67,50,0.08)]"
                  : "text-zinc-400",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex h-7 w-7 items-center justify-center rounded-full transition",
                  active ? "text-pg-forest" : "text-zinc-400",
                )}
              >
                {item.icon()}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
