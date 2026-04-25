"use client";

import dynamic from "next/dynamic";
import type { PlanId } from "@prisma/client";

const JessicaChat = dynamic(
  () => import("@/components/jessica-chat").then((m) => ({ default: m.JessicaChat })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[60vh] flex-col gap-3"
        aria-busy
        suppressHydrationWarning
      >
        <div className="glass-panel h-16 animate-pulse rounded-3xl" />
        <div className="glass-panel min-h-[40vh] flex-1 animate-pulse rounded-3xl" />
        <div className="h-12 animate-pulse rounded-full bg-rose-50/80" />
      </div>
    ),
  },
);

export function JessicaChatShell({
  plan,
  initialCap,
}: {
  plan: PlanId;
  initialCap: number | "∞";
}) {
  return <JessicaChat plan={plan} initialCap={initialCap} />;
}
