import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { pushSubscribeBodySchema, pushUnsubscribeBodySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = pushSubscribeBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Subscrição inválida." }, { status: 400 });
  }

  const { subscription, timeZone } = parsed.data;
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys.p256dh;
  const auth = subscription.keys.auth;

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth },
      update: { userId: user.id, p256dh, auth },
    });

    if (timeZone?.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { reminderTimeZone: timeZone.trim() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/push/subscribe]", e);
    return NextResponse.json({ error: "Não foi possível guardar a subscrição." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = pushUnsubscribeBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint: parsed.data.endpoint },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/push/subscribe DELETE]", e);
    return NextResponse.json({ error: "Não foi possível remover." }, { status: 500 });
  }
}
