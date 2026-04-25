import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import { syncProfileForAuthUser } from "@/lib/session";
import type { User as AuthUser } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = await createClient();

    const { data: signData, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Email ou palavra-passe incorretos." },
        { status: 401 },
      );
    }

    const authUser = (signData.user ?? signData.session?.user) as AuthUser | undefined;
    if (!authUser?.id || !authUser.email) {
      return NextResponse.json(
        { error: "Sessão inválida. Tenta fechar o browser ou desativar bloqueio de cookies." },
        { status: 401 },
      );
    }

    const row = await syncProfileForAuthUser(authUser);

    return NextResponse.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        plan: row.plan,
        onboardingCompleted: row.onboardingCompleted,
      },
    });
  } catch (e) {
    console.error("[api/auth/login]", e);
    return NextResponse.json(
      {
        error:
          "Erro interno ao iniciar sessão. Verifica NEXT_PUBLIC_SUPABASE_* no .env e cookies no browser.",
      },
      { status: 500 },
    );
  }
}
