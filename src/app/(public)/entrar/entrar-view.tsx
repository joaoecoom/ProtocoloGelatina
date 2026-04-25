"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";

export default function EntrarView() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-8 text-sm font-semibold text-pg-berry/90 hover:underline">
        ← Voltar
      </Link>
      <div className="mb-4">
        <BrandLogo variant="auth" />
      </div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-pg-ink">Entrar</h1>
      <p className="mb-2 text-sm text-neutral-600">
        Continua o teu ritual diário e o acompanhamento no dashboard.
      </p>
      <div className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold text-pg-forest/80">
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Plano personalizado</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Ritual diário</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Acompanhamento simples</span>
      </div>
      <LoginForm />
      <p className="mt-8 text-center text-sm text-neutral-500">
        Ainda sem conta?{" "}
        <Link href="/registo" className="font-semibold text-pg-berry/90 hover:underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
