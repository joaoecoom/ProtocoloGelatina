"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/primary-button";

const storageKey = (userId: string) => `protocolo-gelatina-welcome-${userId}`;

const steps = [
  {
    title: "1. Começa no Início (dashboard)",
    body: "Atualiza o teu peso, regista água e como te sentes (inchaço, energia, fome, sono). No fim do dia, confirma o ritual com «Já fiz a minha gelatina hoje» — assim o streak acompanha-te.",
    href: "/dashboard",
    cta: "Ir para o Início",
  },
  {
    title: "2. Segue o Protocolo",
    body: "Vê o plano, lembretes e a lógica do ritual em torno da gelatina. É o mapa do dia a dia.",
    href: "/protocolo",
    cta: "Abrir Protocolo",
  },
  {
    title: "3. Fala com a Jéssica",
    body: "Tira dúvidas rápidas alinhadas ao protocolo — útil quando precisas de um empurrão ou de clarificar o próximo passo.",
    href: "/jessica",
    cta: "Abrir Jéssica",
  },
  {
    title: "4. Explora o resto da app",
    body: "No topo tens Ebooks e Loja. Na barra de baixo, Planos mostra a matriz de níveis quando quiseres evoluir.",
    href: "/planos",
    cta: "Ver Planos",
  },
] as const;

type Props = {
  userId: string;
  /** Servidor: ainda não marcou o guia como visto. */
  showFromServer: boolean;
};

export function WelcomeGuideModal({ userId, showFromServer }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(storageKey(userId))) {
        setOpen(false);
        return;
      }
    } catch {
      /* private mode */
    }
    setOpen(showFromServer);
  }, [userId, showFromServer]);

  const dismiss = useCallback(
    async (navigateTo?: "/dashboard") => {
      try {
        window.localStorage.setItem(storageKey(userId), "1");
      } catch {
        /* ignore */
      }
      setOpen(false);
      try {
        const res = await fetch("/api/user/welcome-guide", { method: "PATCH" });
        if (res.ok) router.refresh();
      } catch {
        /* offline — localStorage já escondeu */
      }
      if (navigateTo) router.push(navigateTo);
    },
    [router, userId],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 pb-8 sm:items-center sm:p-6"
      suppressHydrationWarning
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-guide-title"
    >
      <div
        className="glass-panel max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/80 p-6 shadow-2xl"
        suppressHydrationWarning
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-rose-400">
          Primeira vez aqui
        </p>
        <h2
          id="welcome-guide-title"
          className="mt-2 text-xl font-semibold text-neutral-900"
          style={{ fontFamily: "var(--font-poppins), system-ui" }}
        >
          Visão geral — o que fazer nesta ferramenta
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Resumo em quatro passos. Podes voltar a estes ecrãs quando quiseres pela navegação em baixo ou pelos
          links do topo.
        </p>

        <ol className="mt-5 space-y-4">
          {steps.map((s) => (
            <li
              key={s.href}
              className="rounded-2xl border border-rose-100/80 bg-white/60 px-4 py-3"
            >
              <p className="text-sm font-semibold text-neutral-900">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600">{s.body}</p>
              <Link
                href={s.href}
                className="mt-2 inline-block text-xs font-semibold text-rose-500 underline-offset-2 hover:underline"
              >
                {s.cta} →
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <PrimaryButton
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => dismiss()}
          >
            Percebi — fechar este guia
          </PrimaryButton>
          <PrimaryButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => dismiss("/dashboard")}
          >
            Começar no Início
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
