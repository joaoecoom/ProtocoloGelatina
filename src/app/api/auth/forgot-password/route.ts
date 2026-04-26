import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function classifyResetError(message: string): {
  code: string;
  userMessage: string;
  /** Safe to show in the UI to help config (not user email) */
  includeRawMessage: boolean;
} {
  const m = message.toLowerCase();
  if (
    m.includes("redirect") ||
    m.includes("not allowed for redirect") ||
    m.includes("invalid redirect")
  ) {
    return {
      code: "REDIRECT_NOT_ALLOWED",
      userMessage:
        "O link de redefinicao nao e permitido no Supabase. Em Authentication > URL Configuration, adiciona a URL do site (Site URL) e, em Redirect URLs, inclui: https://<teu-dominio>/redefinir-password e o URL local em dev.",
      includeRawMessage: true,
    };
  }
  if (m.includes("rate") && m.includes("limit")) {
    return {
      code: "RATE_LIMIT",
      userMessage: "Muitas tentativas. Espera alguns minutos e tenta de novo.",
      includeRawMessage: false,
    };
  }
  if (m.includes("smtp") || m.includes("sending email") || m.includes("email provider")) {
    return {
      code: "EMAIL_PROVIDER",
      userMessage:
        "O envio de email falhou no servidor (SMTP/provider). No Supabase: Authentication > Emails, confirma o provider ou SMTP; verifica Autenticacao > Auth logs para o detalhe.",
      includeRawMessage: true,
    };
  }
  return {
    code: "RESET_FAILED",
    userMessage: "Nao foi possivel enviar o email de recuperacao. Confirma a configuracao do Supabase (Auth) ou tenta mais tarde.",
    includeRawMessage: true,
  };
}

function toAbsoluteBaseUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

function originFromReferer(request: Request): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Inclui o host com que o browser fez o pedido (ex.: 127.0.0.1:3000 vs localhost:3000),
 * para bater com as Redirect URLs no Supabase.
 */
function originFromRequestHostHeader(request: Request): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const hostOnly = host.split(":")[0] ?? "";
  const isLocal =
    hostOnly === "localhost" || hostOnly === "127.0.0.1" || hostOnly.endsWith(".local");
  const proto =
    request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

function formatAuthError(
  err: { message?: string; status?: number; code?: string; name?: string } | null | undefined,
): string {
  if (!err) return "";
  const bits = [err.message, err.code, err.status != null ? `http ${err.status}` : null].filter(
    (x): x is string => Boolean(x),
  );
  return bits.length ? bits.join(" · ") : String(err);
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const email = typeof json?.email === "string" ? json.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email invalido." }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const candidates = [
      toAbsoluteBaseUrl(request.headers.get("origin")),
      originFromReferer(request),
      originFromRequestHostHeader(request),
      toAbsoluteBaseUrl(process.env.NEXT_PUBLIC_SITE_URL),
      toAbsoluteBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      toAbsoluteBaseUrl(process.env.VERCEL_URL),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

    let lastErrorMessage = "";

    // 1) Tenta com redirectTo explícito (melhor UX)
    for (const baseUrl of candidates) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/redefinir-password`,
      });
      if (!error) {
        return NextResponse.json({ ok: true });
      }
      lastErrorMessage = formatAuthError(error) || lastErrorMessage;
    }

    // 2) Fallback para config default do Supabase (Site URL / template)
    const { error: fallbackError } = await supabase.auth.resetPasswordForEmail(email);
    if (!fallbackError) {
      return NextResponse.json({ ok: true });
    }
    lastErrorMessage = formatAuthError(fallbackError) || lastErrorMessage;

    console.error("[api/auth/forgot-password] reset failed", {
      emailDomain: email.split("@")[1] ?? "",
      lastErrorMessage,
    });

    const { code, userMessage, includeRawMessage } = classifyResetError(lastErrorMessage);

    // Em alguns planos/projetos o Supabase limita bastante o envio de emails.
    // Em produção mascaramos para UX/privacidade; em dev mostramos o motivo.
    if (code === "RATE_LIMIT") {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json(
          {
            error: "Limite de envio de recuperacao atingido. Aguarda alguns minutos e tenta novamente.",
            code,
            detail: lastErrorMessage || undefined,
          },
          { status: 429 },
        );
      }
      return NextResponse.json({
        ok: true,
        info:
          "Se o email existir, vais receber um link de recuperacao em breve. Aguarda alguns minutos antes de tentar novamente.",
      });
    }

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          error:
            "Nao foi possivel enviar o email de recuperacao. Confirma no Supabase: Auth > URL Configuration (Site URL e Redirect URLs) e o SMTP/email provider ativo.",
          detail: lastErrorMessage || undefined,
          code,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: userMessage,
        code,
        ...(includeRawMessage && lastErrorMessage
          ? { detail: lastErrorMessage }
          : {}),
      },
      { status: 400 },
    );
  } catch (e) {
    console.error("[api/auth/forgot-password]", e);
    return NextResponse.json({ error: "Erro interno no pedido." }, { status: 500 });
  }
}
