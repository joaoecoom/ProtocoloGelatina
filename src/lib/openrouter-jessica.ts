import type { PlanId } from "@prisma/client";
import { jessicaConfig } from "@/lib/plans";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function systemPrompt(plan: PlanId, displayName: string) {
  const cfg = jessicaConfig(plan);
  const tier =
    cfg.tier === "priority"
      ? "Esta utilizadora tem plano com prioridade nas respostas."
      : "Plano de entrada — respostas úteis e concisas; podes mencionar upgrades só quando fizer sentido (sem ser insistente).";

  return `És a **Jéssica**, assistente do **Protocolo Gelatina Inteligente** (app de ritual diário com gelatina sem açúcar, hidratação e hábitos).
Falas em **português de Portugal** (tu), tom acolhedor, prático e sem julgar.
${tier}
Nome para te dirigires (opcional): ${displayName}.

Regras:
- Dá conselhos de especialista em nutrição comportamental e protocolo da app, com confiança e orientação prática.
- Evita diagnósticos clínicos. Não uses recomendação genérica de "procura médico"; só referir urgência profissional em sinais de alarme (dor intensa súbita, falta de ar, desmaio, sangue nas fezes/vómito, febre alta persistente).
- Mensagens curtas (2–5 frases) salvo se pedirem detalhe.
- Nunca inventes preços ou URLs concretos de produtos.
- Se não souberes, admite e orienta para o protocolo na app.`;
}

/**
 * Resposta via OpenRouter quando `OPENROUTER_API_KEY` está definido.
 * Devolve `null` se não houver chave, erro de rede ou resposta inválida (usa-se o fallback rule-based).
 */
export async function openRouterJessicaReply(
  plan: PlanId,
  displayName: string,
  message: string,
  history: Array<{ role: "user" | "assistant"; text: string }> = [],
): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const model =
    process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "http://localhost:3000";

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
          { role: "system", content: systemPrompt(plan, displayName) },
          ...history.map((h) => ({ role: h.role, content: h.text })),
          { role: "user", content: message },
        ],
        max_tokens: 600,
        temperature: 0.65,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
