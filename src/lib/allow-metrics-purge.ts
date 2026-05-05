/** Valores que desactivam o POST de purge (case-insensitive). */
const DISALLOWED = new Set(["false", "0", "off", "no"]);

/**
 * Controla se é permitido eliminar eventos via `POST /api/quizdashboard/metrics/purge`.
 * Variável: `ALLOW_METRICS_PURGE` — omitir ou não-falsy ⇒ permitido.
 */
export function isMetricsPurgePostAllowed(): boolean {
  const raw = process.env.ALLOW_METRICS_PURGE;
  if (raw === undefined || raw.trim() === "") return true;
  return !DISALLOWED.has(raw.trim().toLowerCase());
}
