"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar conta.");
      return;
    }
    if (data.needsEmailConfirmation) {
      setInfo(
        "Enviamos um link de confirmação para o teu email. Depois de confirmar, podes entrar em «Entrar».",
      );
      return;
    }
    if (data.user?.onboardingCompleted) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Nome</label>
        <input
          className="pg-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Email</label>
        <input
          className="pg-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Palavra-passe</label>
        <input
          className="pg-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
      <PrimaryButton type="submit" className="w-full" disabled={loading}>
        {loading ? "A criar..." : "Criar conta"}
      </PrimaryButton>
    </form>
  );
}
