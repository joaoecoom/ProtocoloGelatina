import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function LandingView() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-20 pt-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-8 top-0 h-48 w-48 rounded-full bg-pg-berry/10 blur-3xl" />
        <div className="absolute -left-10 top-32 h-40 w-40 rounded-full bg-pg-forest/10 blur-3xl" />
      </div>

      <div className="mb-12 flex flex-col items-center text-center">
        <div className="mb-6 w-full max-w-sm px-1">
          <BrandLogo variant="hero" />
        </div>
        <h1 className="font-display mt-2 text-balance text-3xl font-semibold leading-[1.2] text-pg-ink sm:text-4xl">
          O método simples que faz o teu corpo voltar a{" "}
          <span className="pg-hero-line">queimar gordura</span>
        </h1>
        <p className="mt-4 max-w-sm text-balance text-sm font-medium leading-relaxed text-pg-forest/80">
          Protocolo científico, rotina leve, resultados reais. Sem modas, sem exageros.
        </p>
      </div>

      <ul className="glass-panel mb-8 space-y-3 rounded-[1.5rem] p-5 text-left text-sm font-medium text-pg-ink/85 sm:space-y-4 sm:rounded-3xl sm:p-6">
        {[
          "Sem dietas extremas",
          "Sem esforço insustentável",
          "Só o protocolo certo para o teu metabolismo",
        ].map((line) => (
          <li key={line} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pg-forest/10 text-xs font-bold text-pg-forest"
              aria-hidden
            >
              ✓
            </span>
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-4">
        <Link
          href="/registo"
          className="pg-cta-forest flex h-14 w-full items-center justify-center text-[15px] font-semibold tracking-tight"
        >
          Começar agora
        </Link>
        <p className="text-center text-sm text-pg-forest/70">
          Já tens conta?{" "}
          <Link
            href="/entrar"
            className="font-semibold text-pg-berry decoration-pg-berry/30 underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
