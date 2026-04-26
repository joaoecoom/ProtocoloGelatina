import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import { buildFallbackPrismaUser } from "@/lib/auth-profile";
import type { User as AuthUser } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase().includes("registered")
        ? "Este email já está registado."
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    /**
     * Supabase pode devolver `user` sem erro e sem `identities` quando o email
     * já existe (proteção contra enumeração). Nesse caso não há novo envio.
     */
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return NextResponse.json({ error: "Este email já está registado." }, { status: 400 });
    }

    if (data.user) {
      try {
        await prisma.user.upsert({
          where: { id: data.user.id },
          create: {
            id: data.user.id,
            email,
            name: parsed.data.name,
          },
          update: { email },
        });
      } catch {
        /* Prisma indisponível — perfil será criado no primeiro login */
      }
    }

    const sessionUser = (data.session?.user ?? data.user) as AuthUser | null;

    let userPayload: {
      id: string;
      email: string;
      name: string;
      plan: string;
      onboardingCompleted: boolean;
    } | null = null;

    if (sessionUser?.id) {
      try {
        const row = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (row) {
          userPayload = {
            id: row.id,
            email: row.email,
            name: row.name,
            plan: row.plan,
            onboardingCompleted: row.onboardingCompleted,
          };
        } else {
          const f = buildFallbackPrismaUser({
            ...sessionUser,
            email: sessionUser.email ?? email,
          } as AuthUser);
          userPayload = {
            id: f.id,
            email: f.email,
            name: f.name,
            plan: f.plan,
            onboardingCompleted: f.onboardingCompleted,
          };
        }
      } catch {
        const f = buildFallbackPrismaUser({
          ...sessionUser,
          email: sessionUser.email ?? email,
        } as AuthUser);
        userPayload = {
          id: f.id,
          email: f.email,
          name: f.name,
          plan: f.plan,
          onboardingCompleted: f.onboardingCompleted,
        };
      }
    }

    return NextResponse.json({
      needsEmailConfirmation: !data.session,
      user: userPayload,
    });
  } catch (e) {
    console.error("[api/auth/register]", e);
    return NextResponse.json(
      { error: "Erro interno ao registar. Verifica Supabase e a base de dados." },
      { status: 500 },
    );
  }
}
