"use client";

import dynamic from "next/dynamic";
import type { CourseDetailContentProps } from "./course-detail-content";

const CourseDetailContent = dynamic(
  () => import("./course-detail-content").then((m) => ({ default: m.CourseDetailContent })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4" aria-busy>
        <div className="h-5 w-40 animate-pulse rounded bg-rose-100/80" />
        <div className="h-32 animate-pulse rounded-3xl bg-rose-50/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-rose-50/50" />
      </div>
    ),
  },
);

export function CourseDetailShell(props: CourseDetailContentProps) {
  return <CourseDetailContent {...props} />;
}
