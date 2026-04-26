"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { PrimaryButton } from "@/components/primary-button";
import { createClient } from "@/lib/supabase/client";

function readTokensFromHash() {
  if (typeof window === "undefined") return { accessToken: "", refreshToken: "" };
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token") ?? "",
    refreshToken: params.get("refresh_token") ?? "",
  };
}

export default function ResetPasswordView() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    async function bootstrapRecoverySession() {
      const url = new URL(window.location.href);
      const authErrorDescription = url.searchParams.get("error_description");

      // Em alguns fluxos o supabase-js processa o URL automaticamente ao iniciar.
      // Se a sessao de recuperacao ja existir, nao devemos marcar o link como invalido.
      const initialSession = await supabase.auth.getSession();
      if (initialSession.data.session) {
        setHasRecoverySession(true);
        return;
      }

      if (authErrorDescription) {
        setError("Link invalido ou expirado. Pede um novo link de recuperacao.");
        return;
      }

      // Fluxo token_hash (mais recente no Supabase): ?token_hash=...&type=recovery
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type === "recovery") {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (otpError) {
          setError("Link invalido ou expirado. Pede um novo link de recuperacao.");
          return;
        }
        setHasRecoverySession(true);
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
        return;
      }

      const { accessToken, refreshToken } = readTokensFromHash();
      // Fluxo clássico: tokens no fragmento do URL (#access_token=...).
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError("Link invalido ou expirado. Pede um novo link de recuperacao.");
          return;
        }
        setHasRecoverySession(true);
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
        return;
      }

      // Fluxo PKCE: URL com ?code=... (cada vez mais comum em alguns setups).
      const code = url.searchParams.get("code");
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (codeError) {
          setError("Link invalido ou expirado. Pede um novo link de recuperacao.");
          return;
        }
        setHasRecoverySession(true);
        url.searchParams.delete("code");
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
        return;
      }

      const fallbackSession = await supabase.auth.getSession();
      if (fallbackSession.data.session) {
        setHasRecoverySession(true);
        return;
      }

      setError("Link invalido ou expirado. Pede um novo link de recuperacao.");
    }

    void bootstrapRecoverySession();
  }, [supabase.auth]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!hasRecoverySession) {
      setError("Sessao de recuperacao invalida. Pede um novo link.");
      return;
    }
    if (password.length < 8) {
      setError("A palavra-passe tem de ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As palavras-passe nao coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message?.trim()
          ? `Nao foi possivel atualizar a palavra-passe: ${updateError.message}`
          : "Nao foi possivel atualizar a palavra-passe.",
      );
      return;
    }

    setInfo("Palavra-passe atualizada com sucesso. Ja podes entrar.");
    router.push("/entrar");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Link href="/entrar" className="mb-8 text-sm font-semibold text-pg-berry/90 hover:underline">
        ← Voltar ao login
      </Link>

      <div className="mb-4">
        <BrandLogo variant="auth" />
      </div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-pg-ink">Definir nova palavra-passe</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Escolhe uma palavra-passe nova para voltares a entrar na tua conta.
      </p>

      <form onSubmit={onSubmit} className="glass-panel space-y-4 rounded-3xl p-6">
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Nova palavra-passe</label>
          <input
            className="pg-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-pg-forest/70">Confirmar palavra-passe</label>
          <input
            className="pg-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {error ? (
          <p className="text-xs text-pg-forest/80">
            <Link href="/esqueci-password" className="font-semibold text-pg-berry/90 hover:underline">
              Pedir novo link de recuperacao
            </Link>
          </p>
        ) : null}
        {info ? <p className="text-sm text-emerald-700">{info}</p> : null}

        <PrimaryButton type="submit" className="w-full" disabled={loading || !hasRecoverySession}>
          {loading ? "A guardar..." : "Guardar nova palavra-passe"}
        </PrimaryButton>
      </form>
    </main>
  );
}
