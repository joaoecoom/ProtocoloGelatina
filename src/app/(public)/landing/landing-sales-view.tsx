import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const BENEFITS = [
  "Plano diário simples para desinchar e perder peso sem extremos.",
  "Lembretes push automáticos para manter ritmo com app fechada.",
  "Check-ins rápidos de refeições, água e sintomas em menos de 3 minutos.",
  "Protocolos avançados por objetivo: barriga, energia e sono.",
];

const STEPS = [
  { title: "Registas em 1 minuto", text: "Crias conta, defines objetivo e começas no mesmo momento." },
  { title: "Segues o plano do dia", text: "A app mostra exatamente o próximo passo e o horário ideal." },
  { title: "Recebes apoio diário", text: "Notificações e progresso para não perder consistência." },
];

const FAQ = [
  {
    q: "É para mim mesmo se já tentei de tudo?",
    a: "Sim. O foco é consistência e protocolo prático, não força de vontade infinita.",
  },
  {
    q: "Preciso de muito tempo por dia?",
    a: "Não. O essencial do método cabe em poucos minutos por dia.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O plano mensal pode ser cancelado a qualquer momento.",
  },
];

export default function LandingSalesView() {
  return (
    <main className="relative min-h-dvh overflow-x-clip px-4 pb-20 pt-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -right-12 top-0 h-56 w-56 rounded-full bg-pg-berry/15 blur-3xl" />
        <div className="absolute -left-12 top-40 h-52 w-52 rounded-full bg-pg-forest/12 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <section className="space-y-6">
          <div className="w-fit rounded-full border border-pg-forest/10 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-pg-rose-muted">
            Pagina oficial de campanha
          </div>

          <div className="w-full max-w-sm">
            <BrandLogo variant="hero" />
          </div>

          <div>
            <h1 className="font-display text-balance text-3xl font-semibold leading-[1.15] text-pg-ink sm:text-4xl lg:text-5xl">
              A forma mais simples de voltar a <span className="pg-hero-line">desinchar e emagrecer</span>
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-pg-forest/85">
              Metodo pratico, orientado por protocolo e pensado para mulheres reais com rotina apertada.
              Sem dietas malucas e sem culpa.
            </p>
          </div>

          <ul className="glass-panel space-y-3 rounded-3xl p-5 text-sm font-medium text-pg-ink/85 sm:p-6">
            {BENEFITS.map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pg-forest/10 text-xs font-bold text-pg-forest">
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-2 text-center sm:max-w-md">
            {[
              { v: "+1.200", l: "Clientes" },
              { v: "3 min", l: "Por dia" },
              { v: "9", l: "Protocolos" },
            ].map((item) => (
              <div key={item.l} className="rounded-2xl border border-pg-forest/10 bg-white/75 px-2 py-3">
                <p className="text-lg font-semibold text-pg-forest">{item.v}</p>
                <p className="text-[11px] font-medium text-pg-forest/70">{item.l}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5 lg:pt-4">
          <div className="glass-panel rounded-3xl p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Oferta de entrada</p>
            <p className="mt-2 text-3xl font-bold text-pg-ink">6,99€ / 7 dias</p>
            <p className="mt-1 text-sm leading-relaxed text-pg-forest/80">
              Depois continua por <strong>29,99€/mes</strong> para manter acesso completo a app.
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/registo"
                className="pg-cta-berry flex h-13 w-full items-center justify-center text-[15px] font-semibold tracking-tight"
              >
                Quero comecar agora
              </Link>
              <Link
                href="/entrar"
                className="flex h-12 w-full items-center justify-center rounded-full border border-pg-forest/15 bg-white/75 text-sm font-semibold text-pg-forest"
              >
                Ja tenho conta
              </Link>
              <p className="text-center text-xs text-pg-forest/70">Compra segura. Acesso imediato.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-pg-forest/10 bg-white/75 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Como funciona</p>
            <div className="mt-3 space-y-3">
              {STEPS.map((step, idx) => (
                <div key={step.title} className="rounded-2xl border border-pg-forest/10 bg-white/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-pg-forest/60">Passo {idx + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-pg-ink">{step.title}</p>
                  <p className="mt-1 text-sm text-pg-forest/75">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="mx-auto mt-10 w-full max-w-6xl rounded-3xl border border-pg-forest/10 bg-white/75 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Perguntas frequentes</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-pg-forest/10 bg-white/80 p-4">
              <p className="text-sm font-semibold text-pg-ink">{item.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-pg-forest/75">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
