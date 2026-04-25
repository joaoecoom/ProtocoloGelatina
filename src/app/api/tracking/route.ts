import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackingSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/day";

function isMissingSchemaError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2022" || e.code === "P2021");
}

/** Corpo JSON para o cliente: inclui `prismaCode` quando aplica (diagnóstico seguro, não expõe segredos). */
function trackErrorResponse(e: unknown) {
  console.error("[api/tracking]", e);
  if (isMissingSchemaError(e) && e instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      {
        error: "A base de dados deste ambiente ainda não tem as colunas necessárias. Executa os scripts em scripts/ (ou npx prisma db push) no mesmo Postgres do deploy.",
        code: "DB_SCHEMA",
        prismaCode: e.code,
      },
      { status: 503 },
    );
  }
  const dev = process.env.NODE_ENV === "development";
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json(
      {
        error: "Não foi possível processar o pedido.",
        prismaCode: e.code,
        ...(dev
          ? { message: e.message, meta: e.meta, clientVersion: e.clientVersion }
          : { hint: "Vê a documentação do Prisma para o significado de prismaCode (ex. P1001 = ligação à base)." }),
      },
      { status: 500 },
    );
  }
  if (e instanceof Error) {
    return NextResponse.json(
      { error: "Não foi possível processar o pedido.", ...(dev ? { message: e.message, stack: e.stack } : {}) },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: "Não foi possível processar o pedido." }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const date = todayKey();
  try {
    const row = await prisma.dailyTrack.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    return NextResponse.json({ date, tracking: row });
  } catch (e) {
    return trackErrorResponse(e);
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = trackingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const date = todayKey();
  try {
    const existing = await prisma.dailyTrack.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    const moodFromBody = parsed.data.moodNote;
    const moodNote =
      moodFromBody === undefined
        ? (existing?.moodNote ?? null)
        : moodFromBody.trim() === ""
          ? null
          : moodFromBody.trim();

    const data = {
      waterMl: parsed.data.waterMl ?? existing?.waterMl ?? 0,
      moodNote,
      bloating: parsed.data.bloating ?? existing?.bloating ?? 0,
      energy: parsed.data.energy ?? existing?.energy ?? 0,
      hunger: parsed.data.hunger ?? existing?.hunger ?? 0,
      sleep: parsed.data.sleep ?? existing?.sleep ?? 0,
      markManha: parsed.data.markManha ?? existing?.markManha ?? false,
      markAlmoco: parsed.data.markAlmoco ?? existing?.markAlmoco ?? false,
      markLanche: parsed.data.markLanche ?? existing?.markLanche ?? false,
      markJanta: parsed.data.markJanta ?? existing?.markJanta ?? false,
    };

    const row = await prisma.dailyTrack.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: { userId: user.id, date, ...data },
      update: data,
    });

    return NextResponse.json({ tracking: row });
  } catch (e) {
    return trackErrorResponse(e);
  }
}
