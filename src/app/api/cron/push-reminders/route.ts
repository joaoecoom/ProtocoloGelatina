import { NextResponse } from "next/server";
import { runAllPushReminders } from "@/lib/push/reminder-runner";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

/**
 * Vercel Cron: define `CRON_SECRET` no projeto; o pedido inclui `Authorization: Bearer …`.
 * Em desenvolvimento local, sem `CRON_SECRET`, o endpoint fica acessível para testes manuais.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  try {
    const result = await runAllPushReminders();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/push-reminders]", e);
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
