"use client";

import dynamic from "next/dynamic";

const OnboardingView = dynamic(() => import("./onboarding-view"), {
  ssr: false,
  loading: () => (
    <div className="min-h-dvh max-w-md" suppressHydrationWarning aria-busy />
  ),
});

export function OnboardingPageClient() {
  return (
    <div className="min-h-dvh" suppressHydrationWarning>
      <OnboardingView />
    </div>
  );
}
