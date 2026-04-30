"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

type LoginFormProps = {
  initialEmail?: string;
  initialPassword?: string;
  helperText?: string;
  topHelperText?: string;
  emailHint?: string;
  passwordInputType?: "password" | "text";
  passwordHint?: string;
};

export function LoginForm({
  initialEmail = "",
  initialPassword = "",
  helperText,
  topHelperText,
  emailHint,
  passwordInputType = "password",
  passwordHint,
}: LoginFormProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
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
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const safeNext =
      requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;
    const nextPath = safeNext ?? (data.user.onboardingCompleted ? "/app-install" : "/onboarding");
    router.push(nextPath);
    router.refresh();
    // Fallback para browsers embebidos onde o router client pode falhar.
    setTimeout(() => {
      window.location.assign(nextPath);
    }, 150);
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
      {topHelperText ? <p className="whitespace-pre-line text-sm text-neutral-600">{topHelperText}</p> : null}
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
        {emailHint ? (
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            {emailHint}
          </div>
        ) : null}
      </div>
      <div>
        <label className="text-xs font-semibold text-pg-forest/70">Palavra-passe</label>
        <input
          className="pg-input"
          type={passwordInputType}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {passwordHint ? (
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            {passwordHint}
          </div>
        ) : null}
      </div>
      <div className="-mt-1 text-right">
        <Link href="/esqueci-password" className="text-xs font-semibold text-pg-berry/90 hover:underline">
          Esqueci-me da palavra-passe
        </Link>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {helperText ? <p className="text-xs text-neutral-600">{helperText}</p> : null}
      <PrimaryButton type="submit" className="w-full" disabled={loading}>
        {loading ? "A entrar..." : "Entrar"}
      </PrimaryButton>
    </form>
  );
}
