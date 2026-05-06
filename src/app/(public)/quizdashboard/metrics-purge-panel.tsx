"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type MetricsPurgeLogDTO = {
  id: string;
  createdAt: string;
  createdByEmail: string;
  scope: string;
  eventsRemoved: number;
  summaryBefore: unknown;
  label?: string | null;
};

const SCOPE_LABEL: Record<string, string> = {
  quiz_gelatina: "Quiz gelatina",
  all: "Todos os eventos",
};

function formatLisbon(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Resumo legível para snapshots v1 (cards alinhados ao dashboard). */
function snapshotTeaser(summaryBefore: unknown): string | null {
  if (!summaryBefore || typeof summaryBefore !== "object") return null;
  const s = summaryBefore as Record<string, unknown>;
  if (s.schemaVersion !== 1) return null;
  const dashboardCards = s.dashboardCards as Record<string, unknown> | undefined;
  const totals = dashboardCards?.totals as Record<string, unknown> | undefined;
  if (!totals || typeof totals !== "object") return null;
  const raw = s.raw as Record<string, unknown> | undefined;
  const euro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    Number(totals.revenue ?? 0),
  );
  const parts = [
    `${totals.sessions} sess.`,
    `${totals.visits} visit.`,
    `${totals.leads} leads`,
    `${totals.sales} vendas`,
    euro,
    `${Number(totals.conversion_rate ?? 0).toFixed(1)}% conv.`,
  ];
  if (typeof raw?.totalEvents === "number") {
    parts.push(`${raw.totalEvents} linhas apagadas`);
  }
  return parts.join(" · ");
}

export function MetricsPurgePanel(props: {
  initialLogs: MetricsPurgeLogDTO[];
  exportHref: string;
  tableUnavailable?: boolean;
  /** Se false, o servidor recusa POST; o botão fica desactivado. */
  purgePostAllowed?: boolean;
  /** Abre e destaca uma linha do histórico (query `?reset=id`). */
  highlightResetId?: string;
}) {
  const canPurge = props.purgePostAllowed !== false;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dangerAll, setDangerAll] = useState(false);
  const [resetName, setResetName] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const confirmExpected = dangerAll ? "ELIMINAR TUDO" : "ELIMINAR";

  const sortedLogs = useMemo(() => [...props.initialLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [props.initialLogs]);

  useEffect(() => {
    const id = props.highlightResetId?.trim();
    if (!id || sortedLogs.length === 0) return;
    if (!sortedLogs.some((l) => l.id === id)) return;
    setExpanded((m) => ({ ...m, [id]: true }));
    requestAnimationFrame(() => {
      document.getElementById(`purge-log-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [props.highlightResetId, sortedLogs]);

  async function submitPurge() {
    setMessage(null);
    if (phrase !== confirmExpected) {
      setMessage({ kind: "err", text: `Confirmação incorrecta. Usa exactamente: ${confirmExpected}` });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/quizdashboard/metrics/purge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: dangerAll ? "all" : "quiz_gelatina",
          confirmPhrase: phrase,
          label: resetName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; removed?: number; logId?: string; error?: string };
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Pedido falhou." });
        return;
      }
      setMessage({ kind: "ok", text: `Eliminados ${data.removed ?? 0} eventos. A página vai actualizar.` });
      setOpen(false);
      setPhrase("");
      setResetName("");
      setDangerAll(false);
      if (data.logId) {
        router.push(`/quizdashboard?reset=${encodeURIComponent(data.logId)}`);
      } else {
        router.refresh();
      }
    } catch {
      setMessage({ kind: "err", text: "Erro de rede." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
      <details>
        <summary className="cursor-pointer list-none rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-pg-ink">
          Expandir reset de métricas
        </summary>
        <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-pg-ink">Reset de métricas</h2>
          <p className="mt-1 text-sm text-pg-ink/75">
            Antes de cada eliminação guardamos um snapshot: totais / funil / passos como no dashboard (sem tráfego de teste interno) mais contagens brutas por evento.
          </p>
          <p className="mt-2 text-xs text-pg-ink/65">
            Sugestão:{" "}
            <a href={props.exportHref} className="font-semibold text-emerald-800 underline underline-offset-2">
              exportar CSV
            </a>{" "}
            antes de limpar, se precisares do detalhe bruto.
          </p>
          {props.tableUnavailable ? (
            <p className="mt-2 text-xs font-semibold text-rose-700">
              A base de dados ainda não tem a tabela de histórico. No Supabase → SQL Editor, executa o SQL em{" "}
              <code className="rounded bg-white/80 px-1">prisma/migrations/20260505130000_add_metrics_purge_logs/migration.sql</code>{" "}
              (e depois <code className="rounded bg-white/80 px-1">20260505240000_metrics_purge_log_label/migration.sql</code> se já tinhas a
              tabela). Sem isto não guardamos resets nem nomes.
            </p>
          ) : null}
          {!canPurge ? (
            <p className="mt-2 text-xs font-semibold text-amber-900">
              Eliminação de métricas desactivada no servidor (<code className="rounded bg-white/80 px-1">ALLOW_METRICS_PURGE</code>
              ). Para voltar a permitir, remove a variável ou deixa de usar false / 0 / off / no.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!canPurge}
          onClick={() => {
            if (!canPurge) return;
            setOpen(true);
            setMessage(null);
          }}
          title={!canPurge ? "ALLOW_METRICS_PURGE desactiva o purge neste ambiente." : undefined}
          className="shrink-0 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-500"
        >
          Limpar métricas…
        </button>
      </div>

      {sortedLogs.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pg-ink/60">Histórico de resets</p>
          <p className="mt-1 text-xs text-pg-ink/60">
            Usa «Abrir» ou «Copiar link» para voltar a este snapshot mais tarde (<code className="rounded bg-neutral-100 px-1">?reset=id</code>
            ).
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-pg-ink/70">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Ambito</th>
                  <th className="px-3 py-2">Eventos</th>
                  <th className="px-3 py-2">Por</th>
                  <th className="px-3 py-2">Abrir</th>
                  <th className="px-3 py-2">Resumo antes</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map((log) => {
                  const teaser = snapshotTeaser(log.summaryBefore);
                  const isHighlight = props.highlightResetId === log.id;
                  return (
                  <tr
                    key={log.id}
                    id={`purge-log-${log.id}`}
                    className={`border-b border-neutral-100 last:border-0 ${isHighlight ? "bg-emerald-50/80" : ""}`}
                  >
                    <td className="max-w-[10rem] px-3 py-2 text-xs font-medium text-pg-ink">
                      {log.label?.trim() ? log.label : <span className="text-pg-ink/45">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-pg-ink/80">{formatLisbon(log.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{SCOPE_LABEL[log.scope] ?? log.scope}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.eventsRemoved}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-pg-ink/75" title={log.createdByEmail}>
                      {log.createdByEmail}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/quizdashboard?reset=${encodeURIComponent(log.id)}`}
                          className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
                        >
                          Abrir
                        </Link>
                        <button
                          type="button"
                          className="text-left text-xs font-semibold text-pg-ink/70 underline underline-offset-2 hover:text-pg-ink"
                          onClick={async () => {
                            const url = `${window.location.origin}/quizdashboard?reset=${encodeURIComponent(log.id)}`;
                            await navigator.clipboard.writeText(url);
                            setCopiedId(log.id);
                            window.setTimeout(() => setCopiedId((id) => (id === log.id ? null : id)), 2000);
                          }}
                        >
                          {copiedId === log.id ? "Copiado" : "Copiar link"}
                        </button>
                      </div>
                    </td>
                    <td className="max-w-md px-3 py-2 align-top">
                      {teaser ? (
                        <p className="mb-1.5 text-[11px] leading-snug text-pg-ink/75">{teaser}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setExpanded((m) => ({ ...m, [log.id]: !m[log.id] }))}
                        className="text-xs font-semibold text-emerald-800 underline underline-offset-2"
                      >
                        {expanded[log.id] ? "Ocultar" : "Ver JSON completo"}
                      </button>
                      {expanded[log.id] ? (
                        <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-[11px] leading-relaxed text-pg-ink/90">
                          {JSON.stringify(log.summaryBefore, null, 2)}
                        </pre>
                      ) : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : props.tableUnavailable ? null : (
        <p className="mt-3 text-sm text-pg-ink/60">Ainda não houve resets registados.</p>
      )}

      {message ? (
        <p
          className={`mt-3 text-sm ${message.kind === "ok" ? "text-emerald-800" : "text-rose-700"}`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
        </div>
      </details>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-pg-ink">Confirmar eliminação</h3>
            <p className="mt-2 text-sm text-pg-ink/75">
              {dangerAll
                ? "Isto apaga todos os eventos da base (todas as fontes e funis). Irreversível."
                : "Isto apaga apenas eventos com funil «quiz_gelatina». Irreversível."}
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dangerAll}
                onChange={(e) => {
                  setDangerAll(e.target.checked);
                  setPhrase("");
                }}
              />
              <span>Modo perigoso: apagar todos os eventos (não só o quiz)</span>
            </label>
            <label className="mt-4 block text-sm font-semibold text-pg-ink">
              Nome deste reset <span className="font-normal text-pg-ink/60">(opcional)</span>
              <input
                type="text"
                value={resetName}
                onChange={(e) => setResetName(e.target.value)}
                maxLength={200}
                placeholder='Ex.: Antes de mudar passos do quiz — Jan 2026'
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-pg-ink">
              Escreve <span className="font-mono text-rose-700">{confirmExpected}</span>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                placeholder={confirmExpected}
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPhrase("");
                  setResetName("");
                  setDangerAll(false);
                }}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-pg-ink hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading || phrase !== confirmExpected}
                onClick={() => void submitPurge()}
                className="rounded-xl border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "A eliminar…" : "Eliminar agora"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
