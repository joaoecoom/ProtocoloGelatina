"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/primary-button";
import { GlassCard } from "@/components/glass-card";
import { PLAN_CATALOG } from "@/lib/plans";

type Msg = { role: "user" | "assistant"; text: string };

export function JessicaChat({
  plan,
  initialCap,
}: {
  plan: string;
  initialCap: number | "∞";
}) {
  const quickSuggestions = [
    "O que faço se tiver fome?",
    "Posso trocar a gelatina?",
    "Estou inchada hoje",
    "Falhei um dia",
  ] as const;
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Olá João, sou a Jéssica. Posso ajudar-te com o ritual de hoje, fome, energia ou dúvidas sobre a gelatina.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | "∞" | null>(null);
  const [hasApiFallback, setHasApiFallback] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const planLabel = PLAN_CATALOG[plan as keyof typeof PLAN_CATALOG]?.label ?? "Plano ativo";

  useEffect(() => {
    let mounted = true;
    void fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data?.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => setHasApiFallback(true));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: messages.slice(-10),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      if (res.status >= 500) setHasApiFallback(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            data.error ??
            "Não consegui responder agora. Tenta novamente dentro de instantes.",
        },
      ]);
      if (data.upgrade) {
        setRemaining(0);
      }
      return;
    }
    setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    setHasApiFallback(false);
    if (typeof data.remaining === "number") {
      setRemaining(data.remaining);
    } else {
      setRemaining("∞");
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-3" suppressHydrationWarning>
      <GlassCard className="text-xs text-pg-forest/80">
        Plano atual: <span className="font-bold text-pg-ink">{planLabel}</span>
        {initialCap === "∞" ? (
          <span className="ml-2 rounded-full border border-pg-forest/15 bg-pg-mint/50 px-2 py-0.5 text-[10px] font-bold text-pg-forest-light">
            Jéssica ilimitada
          </span>
        ) : (
          <span className="ml-2 rounded-full border border-pg-berry/10 bg-pg-cream px-2 py-0.5 text-[10px] font-bold text-pg-berry">
            Limite diário: {initialCap} mensagens
          </span>
        )}
        {remaining !== null && remaining !== "∞" ? (
          <span className="ml-2">Restantes hoje: {remaining}</span>
        ) : null}
      </GlassCard>
      {hasApiFallback ? (
        <p className="rounded-2xl border border-pg-berry/15 bg-pg-cream px-3 py-2 text-xs text-pg-rose-muted">
          A ligação inteligente está intermitente. A Jéssica continua a responder em modo essencial.
        </p>
      ) : null}

      <div
        className="glass-panel flex-1 space-y-3 overflow-y-auto rounded-3xl p-4"
        suppressHydrationWarning
      >
        {messages.map((m, idx) => (
          <div
            key={`${idx}-${m.text.slice(0, 12)}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            suppressHydrationWarning
          >
            <div
              className={`max-w-[88%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "pg-bubble-user"
                  : "border border-pg-forest/6 bg-white/90 text-pg-ink/95 shadow-[0_2px_12px_-4px_rgba(27,67,50,0.12)]"
              }`}
              suppressHydrationWarning
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading ? (
          <p className="text-center text-xs text-pg-rose-muted">A Jéssica está a escrever…</p>
        ) : null}
        {messages.length <= 1 ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-pg-forest/65">Sugestões rápidas</p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setInput(suggestion)}
                  className="rounded-full border border-pg-forest/10 bg-white/80 px-3 py-1.5 text-xs font-semibold text-pg-forest/80"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-[4.9rem] z-10 flex gap-2 pb-1" suppressHydrationWarning>
        <input
          className="flex-1 rounded-full border border-pg-forest/10 bg-white/95 px-4 py-3 text-sm text-pg-ink shadow-inner outline-none transition placeholder:text-zinc-400 focus:border-pg-berry/20 focus:ring-2 focus:ring-pg-berry/10"
          placeholder="Escreve a tua dúvida…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <PrimaryButton type="button" className="px-5" disabled={loading} onClick={() => void send()}>
          Enviar
        </PrimaryButton>
      </div>
    </div>
  );
}
