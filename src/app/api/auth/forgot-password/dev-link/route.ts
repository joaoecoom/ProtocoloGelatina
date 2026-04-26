import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Nao encontrado." }, { status: 404 });
  }

  const json = await request.json().catch(() => ({}));
  const email = typeof json?.email === "string" ? json.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email invalido." }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const baseUrl =
      toAbsoluteBaseUrl(request.headers.get("origin")) ??
      toAbsoluteBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
      "http://localhost:3000";

    const result = await (supabase.auth.admin as any).generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${baseUrl}/redefinir-password`,
      },
    });

    const error = result?.error as { message?: string } | null | undefined;
    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel gerar o link de teste." },
        { status: 400 },
      );
    }

    const actionLink: string | undefined =
      result?.data?.properties?.action_link ??
      result?.data?.action_link ??
      result?.data?.properties?.hashed_token;

    if (!actionLink || typeof actionLink !== "string") {
      return NextResponse.json(
        { error: "Link de recuperacao nao retornado pela API admin." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, link: actionLink });
  } catch (e) {
    console.error("[api/auth/forgot-password/dev-link]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
