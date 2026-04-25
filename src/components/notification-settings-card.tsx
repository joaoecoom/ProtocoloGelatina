"use client";

import { useCallback, useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";
import {
  DEFAULT_MEAL_SCHEDULE,
  MEAL_SLOT_KEYS,
  type MealSlotKey,
} from "@/lib/push/meal-slots";
import { syncProtocolPlansStateToServer } from "@/lib/protocol-plans";
import { mealReminderScheduleSchema, notificationPrefsBodySchema } from "@/lib/validators";
import type { z } from "zod";

type NotificationPrefs = z.infer<typeof notificationPrefsBodySchema>;

const PREFS_KEY = "pg-notification-prefs-v1";
const PUSH_ACTIVE_KEY = "pg-push-active";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function readLocalMealSchedule(): Record<MealSlotKey, string> {
  const base = { ...DEFAULT_MEAL_SCHEDULE };
  if (typeof window === "undefined") return base;
  for (const key of MEAL_SLOT_KEYS) {
    const v = window.localStorage.getItem(`pg-slot-schedule-${key}`);
    if (v) base[key] = v;
  }
  return base;
}

async function syncMealScheduleToServer() {
  const raw = readLocalMealSchedule();
  const parsed = mealReminderScheduleSchema.safeParse(raw);
  if (!parsed.success) return;
  await fetch("/api/user/meal-reminder-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
}

export function NotificationSettingsCard() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    daily: true,
    progress: true,
    reactivation: true,
  });
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setPrefs({
        daily: parsed.daily !== false,
        progress: parsed.progress !== false,
        reactivation: parsed.reactivation !== false,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sw = "serviceWorker" in navigator;
    const pm = "PushManager" in window;
    setPushSupported(sw && pm && Boolean(vapidPublic));
    if (!sw) return;
    void navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setPushSubscribed(Boolean(sub));
        if (sub) window.localStorage.setItem(PUSH_ACTIVE_KEY, "1");
        else window.localStorage.removeItem(PUSH_ACTIVE_KEY);
      }),
    );
  }, [vapidPublic]);

  const persistPrefs = useCallback((next: NotificationPrefs) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    }
    void fetch("/api/user/notification-prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {
      /* offline — prefs ficam em localStorage */
    });
  }, []);

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    persistPrefs(next);
  }

  async function enableWebPush() {
    setBanner(null);
    if (!vapidPublic) {
      setBanner("O servidor ainda não tem chaves VAPID configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setBanner("Este browser não suporta notificações push em segundo plano.");
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await reg.update();
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setBanner("Precisamos de permissão para mostrar notificações.");
        setBusy(false);
        return;
      }
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setBanner("Não foi possível criar a subscrição push.");
        setBusy(false);
        return;
      }
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            expirationTime: json.expirationTime ?? null,
          },
          timeZone,
        }),
      });
      if (!res.ok) {
        setBanner("Não foi possível guardar a subscrição no servidor.");
        setBusy(false);
        return;
      }
      await syncMealScheduleToServer();
      await syncProtocolPlansStateToServer();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PUSH_ACTIVE_KEY, "1");
      }
      setPushSubscribed(true);
      setBanner("Push ativo: vais receber lembretes mesmo com o site fechado (exceto limitações do iOS).");
    } catch (e) {
      console.error(e);
      setBanner("Erro ao ativar push. Tenta noutro browser ou verifica HTTPS.");
    } finally {
      setBusy(false);
    }
  }

  async function disableWebPush() {
    setBanner(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint }),
        });
        await sub.unsubscribe();
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PUSH_ACTIVE_KEY);
      }
      setPushSubscribed(false);
      setBanner("Push desativado neste dispositivo.");
    } catch (e) {
      console.error(e);
      setBanner("Não foi possível desativar por completo; tenta outra vez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard>
      <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Notificações</p>
      <p className="mt-2 text-xs leading-relaxed text-pg-forest/75">
        Com <strong>push Web</strong>, o servidor envia lembretes na hora das refeições mesmo quando não tens o separador
        aberto. No <strong>iPhone</strong> só funciona em versões recentes de Safari e com o site em contexto de app
        (PWA) — é uma limitação da Apple.
      </p>

      <div className="mt-4 space-y-2">
        {[
          { key: "daily" as const, label: "Lembretes de refeições", example: "Horários que definires no painel de hoje." },
          {
            key: "progress" as const,
            label: "Progresso",
            example: "Hora da gelatina dos planos activos e aviso 2 dias antes do fim da fase.",
          },
          {
            key: "reactivation" as const,
            label: "Reativação",
            example: "Lembrete matinal se estiveres há 2+ dias sem registar gelatina.",
          },
        ].map((row) => (
          <label
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-pg-forest/10 bg-white/70 px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-pg-ink">{row.label}</p>
              <p className="text-xs text-pg-forest/70">{row.example}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[row.key]}
              onChange={(e) => setPref(row.key, e.target.checked)}
              className="mt-1 h-4 w-4 accent-pg-berry"
            />
          </label>
        ))}
      </div>

      {!vapidPublic ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Ambiente sem chaves VAPID: define <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> e{" "}
          <code className="rounded bg-amber-100/80 px-1">VAPID_PRIVATE_KEY</code> no deploy (e{" "}
          <code className="rounded bg-amber-100/80 px-1">CRON_SECRET</code> para o cron na Vercel).
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {pushSupported ? (
          pushSubscribed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disableWebPush()}
              className="pg-cta-forest inline-flex h-10 items-center justify-center rounded-full px-4 text-xs disabled:opacity-50"
            >
              {busy ? "A processar…" : "Desativar push neste dispositivo"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void enableWebPush()}
              className="pg-cta-berry inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? "A ativar…" : "Ativar notificações push (site fechado)"}
            </button>
          )
        ) : (
          <p className="text-xs text-pg-forest/70">
            Este browser não suporta Web Push completo aqui. Usa Chrome ou Edge no computador ou Android.
          </p>
        )}
      </div>

      {banner ? <p className="mt-3 text-xs text-pg-forest/90">{banner}</p> : null}
    </GlassCard>
  );
}
