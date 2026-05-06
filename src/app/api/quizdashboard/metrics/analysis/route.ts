import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";
const DASHBOARD_ACCESS_COOKIE = "quizdashboard_access";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type IncomingPayload = {
  stageLosses?: Array<{ stageLabel?: string; retentionPct?: number; lossPct?: number; sessions?: number }>;
  topStepLosses?: Array<{ stepLabel?: string; lossVsPrevious?: number; fromPreviousRate?: number }>;
  leadMetrics?: Record<string, number>;
  totals?: Record<string, number>;
  filters?: Record<string, unknown>;
};

async function requireAccess() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const cookieStore = await cookies();
  if (cookieStore.get(DASHBOARD_ACCESS_COOKIE)?.value !== "ok") {
    return NextResponse.json({ error: "Password do dashboard necessária." }, { status: 403 });
  }
  return null;
}

function fallbackAnalysis(payload: IncomingPayload) {
  const stages = payload.stageLosses ?? [];
  const steps = payload.topStepLosses ?? [];
  const lead = payload.leadMetrics ?? {};
  const worstStage = [...stages].sort((a, b) => (b.lossPct ?? 0) - (a.lossPct ?? 0))[0];
  const worstSteps = steps.slice(0, 3);
  const checkoutConv = Number(lead.conversaoCheckoutPct ?? 0);
  const interaction = Number(lead.taxaInteracaoPct ?? 0);

  return [
    "## Leitura automática do funil",
    "",
    worstStage
      ? `1) **Maior buraco macro**: \`${worstStage.stageLabel}\` com perda de **${Number(worstStage.lossPct ?? 0).toFixed(2)}%** (retenção ${Number(worstStage.retentionPct ?? 0).toFixed(2)}%).`
      : "1) Não há dados suficientes para identificar buraco macro.",
    worstSteps.length
      ? `2) **Etapas com maior fuga**: ${worstSteps
          .map((s) => `${s.stepLabel} (${Number(s.lossVsPrevious ?? 0).toFixed(2)}%)`)
          .join(", ")}.`
      : "2) Sem dados de micro-etapas para identificar maior fuga.",
    `3) **Taxa de interação** (visitante -> lead): **${interaction.toFixed(2)}%**.`,
    `4) **Conversão de checkout**: **${checkoutConv.toFixed(2)}%**.`,
    "",
    "## Prioridades de melhoria (sugestão)",
    "- Reforçar copy/transição imediatamente antes da pior etapa macro.",
    "- Testar 2-3 variações no passo com maior fuga (headline, prova social, fricção do input).",
    "- Rever evento/UX no checkout para reduzir abandono (confiança, preço, método de pagamento).",
  ].join("\n");
}

async function llmAnalysis(payload: IncomingPayload): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "http://localhost:3000";

  const system = `És um analista CRO sénior.
Fala em PT-PT, objetivo e acionável.
Identifica os maiores buracos do funil com base nos números e propõe melhorias priorizadas.
Formato de saída:
1) Top 3 buracos (com percentagens)
2) Hipótese de causa por buraco
3) Ação concreta para testar esta semana
4) Ordem de prioridade (P1/P2/P3).`;

  const user = `Analisa estas métricas do funil e responde no formato pedido:\n${JSON.stringify(payload)}`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer,
        "X-Title": "Protocolo Gelatina Inteligente",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 700,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const authError = await requireAccess();
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as { payload?: IncomingPayload } | null;
  const payload = body?.payload;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const fromLlm = await llmAnalysis(payload);
  return NextResponse.json({ analysis: fromLlm ?? fallbackAnalysis(payload), source: fromLlm ? "llm" : "fallback" });
}
