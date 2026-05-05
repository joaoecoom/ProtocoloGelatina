import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { isMetricsPurgePostAllowed } from "@/lib/allow-metrics-purge";
import { prisma } from "@/lib/prisma";
import { buildPurgeSnapshot, eventWhereForScope } from "@/lib/quizdashboard-purge-snapshot";
import { getCurrentUser } from "@/lib/session";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";
const DASHBOARD_ACCESS_COOKIE = "quizdashboard_access";

type Scope = "quiz_gelatina" | "all";

function sanitizeResetLabel(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length > 200 ? s.slice(0, 200) : s;
}

async function requireQuizDashboardAccess(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { error: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Sem permissão." }, { status: 403 }) };
  }
  const cookieStore = await cookies();
  if (cookieStore.get(DASHBOARD_ACCESS_COOKIE)?.value !== "ok") {
    return { error: NextResponse.json({ error: "Password do dashboard necessária." }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const auth = await requireQuizDashboardAccess();
  if ("error" in auth) return auth.error;

  try {
    const logs = await prisma.metricsPurgeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        createdByEmail: true,
        scope: true,
        eventsRemoved: true,
        summaryBefore: true,
        label: true,
      },
    });
    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ logs: [], unavailable: true });
  }
}

export async function POST(request: Request) {
  const auth = await requireQuizDashboardAccess();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isMetricsPurgePostAllowed()) {
    return NextResponse.json(
      {
        error:
          "Eliminação de métricas desactivada (ALLOW_METRICS_PURGE=false ou equivalente no servidor).",
      },
      { status: 403 },
    );
  }

  let body: { scope?: Scope; confirmPhrase?: string; label?: unknown };
  try {
    body = (await request.json()) as { scope?: Scope; confirmPhrase?: string; label?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const scope = body.scope === "all" ? "all" : "quiz_gelatina";
  const phrase = String(body.confirmPhrase ?? "").trim();
  const label = sanitizeResetLabel(body.label);

  if (scope === "quiz_gelatina" && phrase !== "ELIMINAR") {
    return NextResponse.json({ error: 'Escreve exactamente "ELIMINAR" para confirmar.' }, { status: 400 });
  }
  if (scope === "all" && phrase !== "ELIMINAR TUDO") {
    return NextResponse.json({ error: 'Escreve exactamente "ELIMINAR TUDO" para apagar todos os eventos.' }, { status: 400 });
  }

  const where = eventWhereForScope(scope);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const summaryBefore = await buildPurgeSnapshot(tx, scope);
      const removed = summaryBefore.raw.totalEvents;

      const log = await tx.metricsPurgeLog.create({
        data: {
          createdByUserId: user.id,
          createdByEmail: user.email,
          scope,
          eventsRemoved: removed,
          summaryBefore: summaryBefore as unknown as Prisma.InputJsonValue,
          ...(label ? { label } : {}),
        },
      });

      if (removed > 0) {
        await tx.event.deleteMany({ where });
      }

      return { logId: log.id, removed, summaryBefore };
    });

    return NextResponse.json({
      ok: true,
      logId: result.logId,
      removed: result.removed,
      label: label ?? null,
    });
  } catch (e) {
    console.error("[metrics/purge]", e);
    return NextResponse.json(
      {
        error:
          "Não foi possível eliminar (tabela de histórico em falta?). Corre a migração Prisma e tenta de novo.",
      },
      { status: 503 },
    );
  }
}
