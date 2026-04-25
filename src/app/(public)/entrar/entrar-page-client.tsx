"use client";

import dynamic from "next/dynamic";
import { AuthPageSkeleton } from "../auth-page-skeleton";

const EntrarView = dynamic(() => import("./entrar-view"), {
  ssr: false,
  loading: () => <AuthPageSkeleton />,
});

export function EntrarPageClient() {
  return <EntrarView />;
}
