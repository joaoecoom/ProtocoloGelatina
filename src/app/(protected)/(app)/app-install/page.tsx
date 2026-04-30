"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function AppInstallPage() {
  const router = useRouter();
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));
    setIsStandalone(isStandaloneMode());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!isStandalone) return;
    router.replace("/app");
  }, [isStandalone, router]);

  async function installNow() {
    setStatus(null);
    const ev = deferredRef.current;
    if (!ev) {
      if (isIos) {
        setStatus("No iPhone, usa Safari > Partilhar > Adicionar ao ecrã principal.");
      } else {
        setStatus("Abre no Chrome e usa o menu para instalar a app.");
      }
      return;
    }
    await ev.prompt();
    const choice = await ev.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    if (choice.outcome === "accepted") {
      setStatus("Instalação iniciada. Quando terminar, abre pelo ícone da app.");
    } else {
      setStatus("Instalação cancelada. Podes tentar novamente quando quiseres.");
    }
    deferredRef.current = null;
    setHasPrompt(false);
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 pb-24">
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Passo final</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-pg-ink">Instalar app no telemóvel</h1>
        <p className="mt-3 text-sm leading-relaxed text-pg-ink/80">
          A versão web serve apenas para acesso e instalação. Para usar a plataforma no dia a dia, instala e abre a app
          pelo ícone no ecrã principal.
        </p>

        <button
          type="button"
          onClick={() => void installNow()}
          className="mt-5 h-12 w-full rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
        >
          Instalar agora
        </button>

        {isIos ? (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left text-sm text-neutral-700">
            <p className="font-semibold">iPhone (Safari):</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Toca em Partilhar.</li>
              <li>Seleciona “Adicionar ao ecrã principal”.</li>
              <li>Abre a app pelo novo ícone.</li>
            </ol>
          </div>
        ) : null}

        {!isIos && !hasPrompt ? (
          <p className="mt-3 text-xs text-neutral-500">
            Se o botão não abrir o popup, usa o menu do browser e escolhe “Instalar app”.
          </p>
        ) : null}

        {status ? <p className="mt-3 text-xs text-neutral-600">{status}</p> : null}
      </section>

      <div className="flex justify-center">
        <LogoutButton className="h-10 rounded-xl px-4 text-sm" />
      </div>
    </main>
  );
}
