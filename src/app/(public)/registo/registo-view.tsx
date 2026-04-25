"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { RegisterForm } from "@/components/register-form";

export default function RegistoView() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-8 text-sm font-semibold text-pg-berry/90 hover:underline">
        ← Voltar
      </Link>
      <div className="mb-4">
        <BrandLogo variant="auth" />
      </div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-pg-ink">Criar conta</h1>
      <p className="mb-2 text-sm text-neutral-600">
        Nome, email e palavra-passe — começamos logo a personalizar o protocolo.
      </p>
      <div className="mb-6 flex flex-wrap gap-2 text-[11px] font-semibold text-pg-forest/80">
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Plano personalizado</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Ritual diário</span>
        <span className="rounded-full border border-pg-forest/10 bg-white/70 px-3 py-1">Acompanhamento simples</span>
      </div>
      <RegisterForm />
      <p className="mt-8 text-center text-sm text-neutral-500">
        Já tens conta?{" "}
        <Link href="/entrar" className="font-semibold text-pg-berry/90 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
