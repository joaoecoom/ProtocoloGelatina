"use client";

import { OnboardingForm } from "@/components/onboarding-form";

export default function OnboardingView() {
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8"
      suppressHydrationWarning
    >
      <p className="pg-kicker">Onboarding</p>
      <h1 className="font-display mt-2 text-2xl font-semibold text-pg-ink" suppressHydrationWarning>
        Vamos personalizar o teu plano
      </h1>
      <p className="mt-2 text-sm text-pg-forest/75" suppressHydrationWarning>
        Ritual diário simples, plano personalizado e acompanhamento claro desde hoje.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-pg-forest/80">
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Plano personalizado</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Ritual diário</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Acompanhamento simples</span>
      </div>
      <div className="mt-6" suppressHydrationWarning>
        <OnboardingForm />
      </div>
    </main>
  );
}
