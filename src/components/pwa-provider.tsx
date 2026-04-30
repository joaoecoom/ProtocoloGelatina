"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INSTALL_DISMISS_KEY = "pg-pwa-install-banner-dismissed";
const NOTIFY_DISMISS_KEY = "pg-pwa-notify-nudge-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const NOTIFY_PATH_PREFIXES = [
  "/app",
  "/configuracoes",
  "/protocolo",
  "/definicoes",
  "/notificacoes",
];

export function PwaProvider() {
  const pathname = usePathname();
  const isProd = process.env.NODE_ENV === "production";
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isPaidEligible, setIsPaidEligible] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotifyNudge, setShowNotifyNudge] = useState(false);

  useEffect(() => {
    if (!isProd) {
      setIsPaidEligible(false);
      setEligibilityChecked(true);
      return;
    }
    let active = true;
    const checkEligibility = async () => {
      try {
        const res = await fetch("/api/pwa/eligibility", { method: "GET" });
        const data = (await res.json().catch(() => ({}))) as { canInstall?: boolean };
        if (!active) return;
        setIsPaidEligible(Boolean(data.canInstall));
      } catch {
        if (!active) return;
        setIsPaidEligible(false);
      } finally {
        if (active) setEligibilityChecked(true);
      }
    };
    void checkEligibility();
    return () => {
      active = false;
    };
  }, [isProd]);

  useEffect(() => {
    if (!isProd) {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => void reg.unregister());
        });
      }
      return;
    }
    if (!eligibilityChecked || !isPaidEligible) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* registo falhou — app web continua normal */
    });

    const onBip = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      try {
        if (sessionStorage.getItem(INSTALL_DISMISS_KEY)) return;
      } catch {
        /* ignore */
      }
      if (isStandalone()) return;
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [eligibilityChecked, isPaidEligible, isProd]);

  useEffect(() => {
    if (!isProd) return;
    if (!eligibilityChecked || !isPaidEligible) return;
    const checkNotify = async () => {
      if (isStandalone()) return;
      const allowed = NOTIFY_PATH_PREFIXES.some((p) => pathname.startsWith(p));
      if (!allowed) {
        setShowNotifyNudge(false);
        return;
      }
      try {
        if (localStorage.getItem(NOTIFY_DISMISS_KEY)) return;
      } catch {
        /* ignore */
      }
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") return;
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription().catch(() => null);
      if (sub) return;
      setShowNotifyNudge(true);
    };

    void checkNotify();
  }, [eligibilityChecked, isPaidEligible, isProd, pathname]);

  async function onInstallClick() {
    const ev = deferredRef.current;
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice.catch(() => {});
    deferredRef.current = null;
    setShowInstall(false);
    try {
      sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function dismissInstall() {
    setShowInstall(false);
    try {
      sessionStorage.setItem(INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function dismissNotify() {
    setShowNotifyNudge(false);
    try {
      localStorage.setItem(NOTIFY_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!eligibilityChecked || !isPaidEligible) return null;
  if (!showInstall && !showNotifyNudge) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[90] flex flex-col gap-2 p-3 sm:p-4">
      {showInstall ? (
        <div
          className="pointer-events-auto mx-auto flex w-full max-w-lg flex-col gap-2 rounded-2xl border border-emerald-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          role="dialog"
          aria-label="Instalar aplicação"
        >
          <p className="text-sm font-medium text-pg-ink">
            Instala o <strong>Protocolo Gelatina</strong> no teu telemóvel para acederes mais rápido.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={dismissInstall}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-pg-ink/80 hover:bg-neutral-50"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => void onInstallClick()}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Instalar
            </button>
          </div>
        </div>
      ) : null}

      {showNotifyNudge ? (
        <div
          className="pointer-events-auto mx-auto flex w-full max-w-lg flex-col gap-2 rounded-2xl border border-pg-berry/25 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          role="dialog"
          aria-label="Notificações"
        >
          <p className="text-sm font-medium text-pg-ink">
            Queres lembretes das refeições? Ativa as notificações nas definições da conta.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={dismissNotify}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-pg-ink/80 hover:bg-neutral-50"
            >
              Fechar
            </button>
            <Link
              href="/configuracoes"
              className="rounded-xl bg-pg-forest px-3 py-2 text-center text-sm font-semibold text-white shadow hover:brightness-110"
            >
              Definições
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
