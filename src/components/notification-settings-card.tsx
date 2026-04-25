"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/glass-card";

type NotificationPrefs = {
  daily: boolean;
  progress: boolean;
  reactivation: boolean;
};

const PREFS_KEY = "pg-notification-prefs-v1";

export function NotificationSettingsCard() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    daily: true,
    progress: true,
    reactivation: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as NotificationPrefs;
      setPrefs(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  function setPref(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    }
  }

  function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") void Notification.requestPermission();
  }

  return (
    <GlassCard>
      <p className="text-xs font-semibold uppercase tracking-wide text-pg-rose-muted">Notificações</p>
      <div className="mt-3 space-y-2">
        {[
          { key: "daily", label: "Lembrete diário", example: "Já fizeste a tua gelatina hoje?" },
          { key: "progress", label: "Progresso", example: "Faltam 2 dias para terminar a fase." },
          { key: "reactivation", label: "Reativação", example: "Volta hoje e retoma o ciclo." },
        ].map((row) => (
          <label key={row.key} className="flex items-start justify-between gap-3 rounded-xl border border-pg-forest/10 bg-white/70 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-pg-ink">{row.label}</p>
              <p className="text-xs text-pg-forest/70">{row.example}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[row.key as keyof NotificationPrefs]}
              onChange={(e) => setPref(row.key as keyof NotificationPrefs, e.target.checked)}
              className="mt-1 h-4 w-4 accent-pg-berry"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={requestNotifications}
        className="pg-cta-forest mt-3 inline-flex h-10 items-center justify-center rounded-full px-4 text-xs"
      >
        Ativar notificações no browser
      </button>
    </GlassCard>
  );
}
