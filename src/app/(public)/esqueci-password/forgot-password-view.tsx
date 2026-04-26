"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PrimaryButton } from "@/components/primary-button";

export default function ForgotPasswordView() {
  const isDev = process.env.NODE_ENV !== "production";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);
    setInfo(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      setError(data.error ?? "Nao foi possivel enviar email.");
      setErrorDetail(
        typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : null,
      );
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { info?: string };
    setInfo(
      typeof data.info === "string" && data.info.trim()
        ? data.info.trim()
        : "Enviamos um email com o link para redefinir a tua palavra-passe.",
    );
  }

  async function onGenerateDevLink() {
    setGeneratingLink(true);
    setError(null);
    setErrorDetail(null);
    setInfo(null);

    const res = await fetch("/api/auth/forgot-password/dev-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setGeneratingLink(false);

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      link?: string;
    };

    if (!res.ok || !data.link) {
      setError(data.error ?? "Nao foi possivel gerar o link de teste.");
      setErrorDetail(
        typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : null,
      );
      return;
    }

    window.location.assign(data.link);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Link href="/entrar" className="mb-8 text-sm font-semibold text-pg-berry/90 hover:underline">
        ← Voltar ao login
      </Link>

      <div className="mb-4">
        <BrandLogo variant="auth" />
      </div>

      <h1 className="mb-1 font-display text-2xl font-semibold text-pg-ink">Recuperar palavra-passe</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Introduz o teu email. Vais receber um link para criares uma nova palavra-passe.
      </p>

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
        {error ? (
          <div className="space-y-1.5 text-sm text-rose-700">
            <p>{error}</p>
            {errorDetail ? (
              <p className="rounded-lg bg-rose-50/80 px-2 py-1.5 text-xs text-rose-800/90">{errorDetail}</p>
            ) : null}
          </div>
        ) : null}
        {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
        <PrimaryButton type="submit" className="w-full" disabled={loading}>
          {loading ? "A enviar..." : "Enviar link de recuperacao"}
        </PrimaryButton>
        {isDev ? (
          <button
            type="button"
            onClick={onGenerateDevLink}
            disabled={generatingLink || !email.trim()}
            className="w-full rounded-xl border border-pg-forest/20 px-4 py-2 text-sm font-semibold text-pg-forest disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingLink ? "A gerar link local..." : "Gerar link de teste (sem email)"}
          </button>
        ) : null}
      </form>
    </main>
  );
}
