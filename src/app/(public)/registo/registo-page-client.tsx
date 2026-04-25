"use client";

import dynamic from "next/dynamic";
import { AuthPageSkeleton } from "../auth-page-skeleton";

const RegistoView = dynamic(() => import("./registo-view"), {
  ssr: false,
  loading: () => <AuthPageSkeleton />,
});

export function RegistoPageClient() {
  return <RegistoView />;
}
