"use client";

import type { IngestEvent } from "./schemas";

export async function postEvent(event: IngestEvent, options?: { keepalive?: boolean }) {
  try {
    await fetch("/api/events/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: options?.keepalive ?? false,
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[tracking] /api/events/ingest failed (rede ou servidor parado?)", e);
    }
  }
}

export function sendEventWithBeacon(event: IngestEvent) {
  if (typeof navigator === "undefined" || typeof Blob === "undefined") return false;
  const blob = new Blob([JSON.stringify(event)], { type: "application/json" });
  return navigator.sendBeacon("/api/events/ingest", blob);
}
