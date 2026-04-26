"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao entrar.");
      return;
    }
    const data = await res.json();
    const nextPath = data.user.onboardingCompleted ? "/dashboard" : "/onboarding";
    router.push(nextPath);
    router.refresh();
    // Fallback para browsers embebidos onde o router client pode falhar.
    setTimeout(() => {
      window.location.assign(nextPath);
    }, 150);
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="-mt-1 text-right">
        <Link href="/esqueci-password" className="text-xs font-semibold text-pg-berry/90 hover:underline">
          Esqueci-me da palavra-passe
        </Link>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <PrimaryButton type="submit" className="w-full" disabled={loading}>
        {loading ? "A entrar..." : "Entrar"}
      </PrimaryButton>
    </form>
  );
}
