"use client";

import dynamic from "next/dynamic";
import type { DashboardContentProps } from "./dashboard-content";

const DashboardContent = dynamic(
  () => import("./dashboard-content").then((m) => ({ default: m.DashboardContent })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-5" aria-busy>
        <div className="h-36 animate-pulse rounded-3xl bg-rose-50/60" />
        <div className="h-64 animate-pulse rounded-3xl bg-rose-50/40" />
      </div>
    ),
  },
);

export function DashboardShell(props: DashboardContentProps) {
  return <DashboardContent {...props} />;
}
