"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";

export default function CheckoutLoginPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
  }, []);

  const helperText = useMemo(
    () =>
      "Utiliza o email que usaste na compra\nA Palavra-passe inicial é: 123456\nSe preferires, altera a palavra-passe clicando em 'Esqueci-me da palavra-passe'. Aqui abaixo",
    [],
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/quiz/obrigado" className="mb-8 text-sm font-semibold text-pg-berry/90 hover:underline">
        ← Voltar
      </Link>
      <div className="mb-4">
        <BrandLogo variant="auth" />
      </div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-pg-ink">Acesso ao Protocolo</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Entra com o teu email de compra para aceder já ao conteúdo.
      </p>

      <LoginForm
        initialEmail={email}
        initialPassword="123456"
        topHelperText={helperText}
        emailHint="Insere o teu email de compra"
        passwordInputType="text"
        passwordHint="Palavra-passe inicial: 123456"
      />
    </main>
  );
}
