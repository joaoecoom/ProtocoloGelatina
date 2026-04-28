"use client";

/**
 * Ferramentas só para desenvolvimento: toasts em falhas de API + painel de texto.
 * Remover `<DevToolsProvider />` do `layout.tsx` raiz antes do lançamento final, se quiseres zero ruído.
 */

import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";

type ApiLogLine = {
  id: string;
  at: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  detail: string;
};

const MAX_LINES = 12;

function pushLog(entry: Omit<ApiLogLine, "id" | "at">) {
  const line: ApiLogLine = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pg-dev-api-log", { detail: line }));
  }
}

function DevApiLogPanel() {
  const [lines, setLines] = useState<ApiLogLine[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ApiLogLine>;
      if (!ce.detail) return;
      setLines((prev) => [ce.detail, ...prev].slice(0, MAX_LINES));
    };
    window.addEventListener("pg-dev-api-log", handler as EventListener);
    return () => window.removeEventListener("pg-dev-api-log", handler as EventListener);
  }, []);

  if (lines.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[100] max-h-[40vh] border-t border-amber-200 bg-amber-50/95 text-left shadow-[0_-4px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-amber-900"
      >
        <span>Erros de API (dev) — {lines.length} recente(s)</span>
        <span className="font-mono text-[10px] font-normal normal-case text-amber-800">{open ? "▼" : "▶"}</span>
      </button>
      {open ? (
        <ul className="max-h-[min(32vh,280px)] overflow-auto border-t border-amber-100 px-3 py-2 font-mono text-[11px] leading-snug text-neutral-800">
          {lines.map((l) => (
            <li key={l.id} className="mb-3 border-b border-amber-100/80 pb-3 last:mb-0 last:border-0 last:pb-0">
              <div className="font-semibold text-red-700">
                {l.status} {l.statusText} · {l.method} {l.url}
              </div>
              <div className="mt-1 whitespace-pre-wrap break-all text-neutral-700">{l.detail || "—"}</div>
              <div className="mt-1 text-[10px] text-neutral-500">{l.at}</div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function useDevFetchInterceptor() {
  const origRef = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const orig = window.fetch.bind(window);
    origRef.current = orig;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await orig(input, init);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = (init?.method ?? "GET").toUpperCase();

      if (url.includes("/api/") && !res.ok) {
        let detail = "";
        try {
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("application/json")) {
            const j: unknown = await res.clone().json();
            if (j && typeof j === "object") {
              const o = j as Record<string, unknown>;
              const parts: string[] = [];
              if (typeof o.error === "string") parts.push(o.error);
              if (typeof o.detail === "string" && o.detail !== o.error) parts.push(o.detail);
              if (typeof o.message === "string") parts.push(o.message);
              if (typeof o.prismaCode === "string") parts.push(`prisma: ${o.prismaCode}`);
              if (typeof o.code === "string" && o.code !== o.prismaCode) parts.push(`code: ${o.code}`);
              if (o.meta != null && process.env.NODE_ENV === "development") {
                try {
                  parts.push(JSON.stringify(o.meta, null, 0).slice(0, 500));
                } catch {
                  /* ignore */
                }
              }
              detail = parts.length ? parts.join("\n\n") : JSON.stringify(j, null, 2).slice(0, 1200);
            } else {
              detail = JSON.stringify(j, null, 2).slice(0, 1200);
            }
          } else {
            detail = (await res.clone().text()).slice(0, 1200);
          }
        } catch {
          detail = "(corpo da resposta ilegível)";
        }

        pushLog({
          method,
          url,
          status: res.status,
          statusText: res.statusText,
          detail,
        });

        toast.error(`API ${res.status} — ${method}`, {
          description: `${url}\n\n${detail}`,
          duration: 45_000,
          closeButton: true,
        });
      }

      return res;
    };

    return () => {
      if (origRef.current) window.fetch = origRef.current;
    };
  }, []);
}

export function DevToolsProvider() {
  useDevFetchInterceptor();

  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      <Toaster position="top-center" richColors closeButton theme="light" />
      <DevApiLogPanel />
    </>
  );
}
