import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getQuizMetricsSummary } from "@/lib/quiz-metrics";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { quizMetricEventSchema } from "@/lib/validators";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";

function isMissingSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

function dbSchemaErrorResponse() {
  return NextResponse.json(
    {
      error:
        "Tabela de métricas do quiz não existe nesta base. Executa `npx prisma db push` (ou migração) para criar `QuizMetricEvent`.",
      code: "DB_SCHEMA",
    },
    { status: 503 },
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const summary = await getQuizMetricsSummary();
    return NextResponse.json(summary);
  } catch (error) {
    if (isMissingSchemaError(error)) return dbSchemaErrorResponse();
    console.error("[api/quiz-metrics][GET]", error);
    return NextResponse.json({ error: "Não foi possível carregar métricas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => ({}));
  const parsed = quizMetricEventSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  try {
    const meta = parsed.data.meta === undefined ? Prisma.sql`NULL` : Prisma.sql`CAST(${JSON.stringify(parsed.data.meta)} AS jsonb)`;

    await prisma.$executeRaw`
      insert into "QuizMetricEvent" (
        "id",
        "sessionId",
        "eventType",
        "step",
        "stepId",
        "questionId",
        "optionId",
        "buttonId",
        "path",
        "meta",
        "createdAt"
      )
      values (
        ${randomUUID()},
        ${parsed.data.sessionId},
        ${parsed.data.eventType},
        ${parsed.data.step ?? null},
        ${parsed.data.stepId ?? null},
        ${parsed.data.questionId ?? null},
        ${parsed.data.optionId ?? null},
        ${parsed.data.buttonId ?? null},
        ${parsed.data.path ?? null},
        ${meta},
        now()
      )
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingSchemaError(error)) return dbSchemaErrorResponse();
    console.error("[api/quiz-metrics][POST]", error);
    return NextResponse.json({ error: "Não foi possível registar evento." }, { status: 500 });
  }
}
