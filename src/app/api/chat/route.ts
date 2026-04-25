import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { todayKey } from "@/lib/day";
import { effectivePlanForAccess, jessicaConfig } from "@/lib/plans";
import { jessicaReply } from "@/lib/jessica-bot";
import { openRouterJessicaReply } from "@/lib/openrouter-jessica";

function getChatMessageDelegate() {
  const maybePrisma = prisma as unknown as {
    chatMessage?: {
      createMany?: (args: unknown) => Promise<unknown>;
      findMany?: (args: unknown) => Promise<Array<{ role: string; text: string }>>;
    };
  };
  return maybePrisma.chatMessage;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const history = Array.isArray(body?.history)
    ? body.history
        .filter((x: unknown): x is { role: "user" | "assistant"; text: string } => {
          if (!x || typeof x !== "object") return false;
          const row = x as { role?: unknown; text?: unknown };
          return (
            (row.role === "user" || row.role === "assistant") &&
            typeof row.text === "string" &&
            row.text.trim().length > 0
          );
        })
        .slice(-12)
    : [];
  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const accessPlan = effectivePlanForAccess(user);
  const { dailyCap } = jessicaConfig(accessPlan);
  const date = todayKey();
  const usage = await prisma.chatUsage.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, count: 0 },
    update: {},
  });

  if (Number.isFinite(dailyCap) && usage.count >= dailyCap) {
    return NextResponse.json(
      {
        error: "Limite diário da Jéssica atingido.",
        upgrade: true,
      },
      { status: 429 },
    );
  }

  const displayName = user.name.split(/\s+/)[0] ?? user.name;
  const fromLlm = await openRouterJessicaReply(accessPlan, displayName, message, history);
  const reply = fromLlm ?? jessicaReply(accessPlan, message);

  await prisma.chatUsage.update({
    where: { userId_date: { userId: user.id, date } },
    data: { count: { increment: 1 } },
  });

  const chatMessage = getChatMessageDelegate();
  if (chatMessage?.createMany) {
    await chatMessage
      .createMany({
        data: [
          { userId: user.id, role: "user", text: message },
          { userId: user.id, role: "assistant", text: reply },
        ],
      })
      .catch(() => {
        /* tabela ainda não migrada neste ambiente */
      });
  }

  const remaining = Number.isFinite(dailyCap) ? dailyCap - usage.count - 1 : null;

  return NextResponse.json({ reply, remaining });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const chatMessage = getChatMessageDelegate();
  const rows = chatMessage?.findMany
    ? await chatMessage
        .findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          take: 120,
        })
        .catch(() => [])
    : [];

  return NextResponse.json({
    messages: rows.map((r) => ({ role: r.role === "assistant" ? "assistant" : "user", text: r.text })),
  });
}
