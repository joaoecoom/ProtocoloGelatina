import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";
const DASHBOARD_ACCESS_COOKIE = "quizdashboard_access";

type TotalsRow = {
  visits: number;
  sessions: number;
  leads: number;
  sales: number;
  revenue: string | number;
  conversion_rate: string | number;
};

type DailyAggRow = {
  date: string;
  funnel_id: string;
  utm_source: string;
  events: number;
  sessions: number;
  leads: number;
  revenue: string | number;
};

type FunnelStepRow = {
  funnel_id: string;
  step_id: string;
  views: number;
  answers: number;
  completions: number;
  drop_rate: string | number;
};

type StageRow = {
  stage: string;
  sessions: number;
};

type OptionRow = {
  value: string | null;
};

type LeadFunnelRow = {
  lead_key: string;
  lead_display: string;
  first_seen: string;
  quiz_started: boolean;
  result_cta_clicked: boolean;
  checkout_started: boolean;
  payment_success: boolean;
  step_answers: Record<string, string> | null;
};
type LeadCountRow = { total: number };
type StepDataHealthRow = {
  step_events: number;
  answered_events: number;
};

const RANGE_TO_DAYS: Record<string, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const QUIZ_STEP_COLUMNS = [
  "intro",
  "goal",
  "kilos",
  "sexo",
  "area-gordura",
  "idade",
  "meta-quilos",
  "prova-mariana",
  "nome",
  "tipo-corpo",
  "impacto-vida",
  "aparencia-fisica",
  "dificuldade-peso",
  "impede-emagrecer",
  "explicacao-gelatina",
  "beneficios",
  "depoimento-claudia",
  "peso-atual",
  "altura",
  "peso-desejado",
  "tempo",
  "sono-horas",
  "hidratacao",
  "fruta-preferida",
  "pre-sales",
  "corpo-sonhos",
  "mensagem-receitinha",
  "apoio",
  "final-sales",
  "checkout-front",
  "checkout-upsell-1",
  "checkout-downsell-1-1",
  "checkout-downsell-1-2",
  "checkout-downsell-1-3",
  "checkout-upsell-2",
  "checkout-downsell-2-1",
  "checkout-downsell-2-2",
  "checkout-downsell-2-3",
] as const;

const STEP_LABELS: Record<(typeof QUIZ_STEP_COLUMNS)[number], string> = {
  intro: "Intro",
  goal: "Objetivo",
  kilos: "Quilos a Perder",
  sexo: "Sexo",
  "area-gordura": "Area de Gordura",
  idade: "Idade",
  "meta-quilos": "Meta em Quilos",
  "prova-mariana": "Prova Mariana",
  nome: "Nome",
  "tipo-corpo": "Tipo de Corpo",
  "impacto-vida": "Impacto na Vida",
  "aparencia-fisica": "Aparencia Fisica",
  "dificuldade-peso": "Dificuldade com Peso",
  "impede-emagrecer": "O que Impede Emagrecer",
  "explicacao-gelatina": "Explicacao Gelatina",
  beneficios: "Beneficios",
  "depoimento-claudia": "Depoimento Claudia",
  "peso-atual": "Peso Atual",
  altura: "Altura",
  "peso-desejado": "Peso Desejado",
  tempo: "Tempo para Objetivo",
  "sono-horas": "Horas de Sono",
  hidratacao: "Hidratacao",
  "fruta-preferida": "Fruta Preferida",
  "pre-sales": "Pré-venda",
  "corpo-sonhos": "Corpo de Sonho",
  "mensagem-receitinha": "Mensagem Receitinha",
  apoio: "Apoio",
  "final-sales": "Oferta Final",
  "checkout-front": "Checkout - Oferta Principal",
  "checkout-upsell-1": "Checkout - Upsell 1",
  "checkout-downsell-1-1": "Checkout - Downsell 1.1",
  "checkout-downsell-1-2": "Checkout - Downsell 1.2",
  "checkout-downsell-1-3": "Checkout - Downsell 1.3",
  "checkout-upsell-2": "Checkout - Upsell 2",
  "checkout-downsell-2-1": "Checkout - Downsell 2.1",
  "checkout-downsell-2-2": "Checkout - Downsell 2.2",
  "checkout-downsell-2-3": "Checkout - Downsell 2.3",
};

function getStepLabel(stepId: string) {
  return (STEP_LABELS as Record<string, string>)[stepId] ?? stepId;
}

function getStepOrder(stepId: string) {
  const idx = QUIZ_STEP_COLUMNS.findIndex((s) => s === stepId);
  return idx === -1 ? 999 : idx;
}

function getStepLabelWithNumber(stepId: string) {
  const order = getStepOrder(stepId);
  if (order === 999) return getStepLabel(stepId);
  return `Etapa ${order + 1} - ${getStepLabel(stepId)}`;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-PT").format(value);
}

function euro(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatLisbonDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadge(active: boolean, activeLabel: string) {
  if (!active) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">-</span>;
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">{activeLabel}</span>;
}

function getLeadExitStepId(stepAnswers: Record<string, string>, hasPurchase: boolean) {
  if (hasPurchase) return null;
  const reachedSteps = QUIZ_STEP_COLUMNS.filter((stepId) => Boolean(stepAnswers[stepId]));
  if (reachedSteps.length === 0) return null;
  return reachedSteps[reachedSteps.length - 1] ?? null;
}

export default async function QuizDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/quizdashboard");
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) redirect("/dashboard");
  const cookieStore = await cookies();
  const hasDashboardAccess = cookieStore.get(DASHBOARD_ACCESS_COOKIE)?.value === "ok";

  const sp = new URLSearchParams();
  const incoming = (await searchParams) ?? {};
  const selectedColParams = Array.isArray(incoming.col)
    ? incoming.col
    : typeof incoming.col === "string"
      ? [incoming.col]
      : [];
  for (const [k, v] of Object.entries(incoming)) {
    if (Array.isArray(v)) {
      if (v[0]) sp.set(k, v[0]);
    } else if (v) sp.set(k, v);
  }
  const authError = sp.get("auth");

  if (!hasDashboardAccess) {
    return (
      <main className="min-h-dvh bg-neutral-50 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5">
          <h1 className="text-xl font-bold text-pg-ink">Acesso protegido</h1>
          <p className="mt-1 text-sm text-pg-ink/70">
            Introduz a password para entrar no dashboard de métricas.
          </p>
          {authError === "invalid" ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Password inválida.
            </p>
          ) : null}
          <form action="/api/quizdashboard/access" method="post" className="mt-4 space-y-3">
            <input type="hidden" name="next" value="/quizdashboard" />
            <div>
              <label htmlFor="dashboard-password" className="mb-1 block text-xs font-semibold text-pg-ink/70">
                Password
              </label>
              <input
                id="dashboard-password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                placeholder="Introduz a password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Entrar no dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  const range = sp.get("range") ?? "30d";
  const month = sp.get("month");
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const perPage = 50;
  const offset = (page - 1) * perPage;
  const funnelFilter = sp.get("funnel") ?? "all";
  const sourceFilter = sp.get("source") ?? "all";
  const days = RANGE_TO_DAYS[range];
  const selectedColumnsSet = new Set(
    selectedColParams.length > 0 ? selectedColParams : [...QUIZ_STEP_COLUMNS],
  );
  const selectedStepColumns = QUIZ_STEP_COLUMNS.filter((col) => selectedColumnsSet.has(col));
  const hasNonDefaultFilters =
    range !== "30d" ||
    Boolean(month) ||
    funnelFilter !== "all" ||
    sourceFilter !== "all" ||
    q.length > 0 ||
    selectedStepColumns.length !== QUIZ_STEP_COLUMNS.length;

  const whereParts: Prisma.Sql[] = [];
  if (range === "month" && month && /^\d{4}-\d{2}$/.test(month)) {
    whereParts.push(
      Prisma.sql`"timestamp" >= to_date(${`${month}-01`}, 'YYYY-MM-DD')
                 AND "timestamp" < (to_date(${`${month}-01`}, 'YYYY-MM-DD') + INTERVAL '1 month')`,
    );
  } else if (days) {
    whereParts.push(Prisma.sql`"timestamp" >= NOW() - (${days} * INTERVAL '1 day')`);
  }
  if (funnelFilter !== "all") {
    whereParts.push(Prisma.sql`COALESCE(funnel_id, 'unknown') = ${funnelFilter}`);
  }
  if (sourceFilter !== "all") {
    whereParts.push(Prisma.sql`COALESCE(utm_source, 'direct') = ${sourceFilter}`);
  }
  if (q.length > 0) {
    whereParts.push(
      Prisma.sql`COALESCE(lead_id, session_id, anonymous_id, visitor_id) ILIKE ${`%${q}%`}`,
    );
  }
  const whereSql = whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const [totalsRows, dailyAggRows, funnelStepRows, stageRows, funnelOptionsRows, sourceOptionsRows, leadFunnelRows, leadCountRows, stepDataHealthRows] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name IN ('page_view', 'landing_view'))::int AS visits,
        COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::int AS sessions,
        COUNT(DISTINCT COALESCE(lead_id, session_id, anonymous_id, visitor_id))::int AS leads,
        COUNT(*) FILTER (WHERE event_name = 'payment_success')::int AS sales,
        COALESCE(SUM(revenue) FILTER (WHERE event_name = 'payment_success'), 0)::numeric(14,2) AS revenue,
        CASE
          WHEN COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id)) = 0 THEN 0
          ELSE ROUND(
            (COUNT(*) FILTER (WHERE event_name = 'payment_success')::numeric
            / COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::numeric) * 100,
            2
          )
        END AS conversion_rate
      FROM events
      ${whereSql}
    `),
    prisma.$queryRaw<DailyAggRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *
        FROM events
        ${whereSql}
      )
      SELECT
        DATE("timestamp")::text AS date,
        COALESCE(funnel_id, 'unknown') AS funnel_id,
        COALESCE(utm_source, 'direct') AS utm_source,
        COUNT(*)::int AS events,
        COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::int AS sessions,
        COUNT(DISTINCT COALESCE(lead_id, session_id, anonymous_id, visitor_id))::int AS leads,
        COALESCE(SUM(revenue), 0)::numeric(14,2) AS revenue
      FROM scoped
      GROUP BY DATE("timestamp"), COALESCE(funnel_id, 'unknown'), COALESCE(utm_source, 'direct')
      ORDER BY DATE("timestamp") DESC
      LIMIT 30
    `),
    prisma.$queryRaw<FunnelStepRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *
        FROM events
        ${whereSql}
      )
      SELECT funnel_id, step_id, views, answers, completions, drop_rate
      FROM (
        SELECT
          COALESCE(funnel_id, 'unknown') AS funnel_id,
          step_id,
          COUNT(*) FILTER (WHERE event_name = 'step_viewed')::int AS views,
          COUNT(*) FILTER (WHERE event_name = 'step_answered')::int AS answers,
          COUNT(*) FILTER (WHERE event_name = 'step_completed')::int AS completions,
          CASE
            WHEN COUNT(*) FILTER (WHERE event_name = 'step_viewed') = 0 THEN 0
            ELSE ROUND(
              (
                (COUNT(*) FILTER (WHERE event_name = 'step_viewed') - COUNT(*) FILTER (WHERE event_name = 'step_completed'))::numeric
                / COUNT(*) FILTER (WHERE event_name = 'step_viewed')::numeric
              ) * 100,
              2
            )
          END AS drop_rate
        FROM scoped
        WHERE step_id IS NOT NULL
        GROUP BY COALESCE(funnel_id, 'unknown'), step_id
      ) t
      ORDER BY funnel_id ASC, step_id ASC
      LIMIT 150
    `),
    prisma.$queryRaw<StageRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT COALESCE(session_id, anonymous_id, visitor_id) AS sid, event_name
        FROM events
        ${whereSql}
      )
      SELECT 'traffic' AS stage, COUNT(DISTINCT sid)::int AS sessions FROM scoped WHERE event_name IN ('page_view', 'landing_view')
      UNION ALL
      SELECT 'quiz_started' AS stage, COUNT(DISTINCT sid)::int AS sessions FROM scoped WHERE event_name = 'quiz_started'
      UNION ALL
      SELECT 'quiz_completed' AS stage, COUNT(DISTINCT sid)::int AS sessions FROM scoped WHERE event_name = 'quiz_completed'
      UNION ALL
      SELECT 'checkout_started' AS stage, COUNT(DISTINCT sid)::int AS sessions FROM scoped WHERE event_name = 'checkout_started'
      UNION ALL
      SELECT 'payment_success' AS stage, COUNT(DISTINCT sid)::int AS sessions FROM scoped WHERE event_name = 'payment_success'
    `),
    prisma.$queryRaw<OptionRow[]>`
      SELECT DISTINCT COALESCE(funnel_id, 'unknown') AS value
      FROM events
      ORDER BY value ASC
    `,
    prisma.$queryRaw<OptionRow[]>`
      SELECT DISTINCT COALESCE(utm_source, 'direct') AS value
      FROM events
      ORDER BY value ASC
    `,
    prisma.$queryRaw<LeadFunnelRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *,
          COALESCE(lead_id, session_id, anonymous_id, visitor_id) AS lead_key
        FROM events
        ${whereSql}
      ),
      latest_steps AS (
        SELECT DISTINCT ON (lead_key, step_id)
          lead_key,
          step_id,
          COALESCE(metadata_json->>'answer_label', metadata_json->>'answer_id', 'viewed') AS answer_label,
          "timestamp"
        FROM scoped
        WHERE event_name IN ('step_answered', 'step_viewed') AND step_id IS NOT NULL
        ORDER BY lead_key, step_id, "timestamp" DESC
      ),
      step_map AS (
        SELECT lead_key, jsonb_object_agg(step_id, answer_label) AS step_answers
        FROM latest_steps
        GROUP BY lead_key
      ),
      lead_rollup AS (
        SELECT
          lead_key,
          COALESCE(MAX(lead_id), lead_key) AS lead_display,
          MIN("timestamp") AS first_seen,
          BOOL_OR(event_name = 'quiz_started') AS quiz_started,
          BOOL_OR(event_name = 'result_cta_clicked') AS result_cta_clicked,
          BOOL_OR(event_name = 'checkout_started') AS checkout_started,
          BOOL_OR(event_name = 'payment_success') AS payment_success
        FROM scoped
        WHERE lead_key IS NOT NULL
        GROUP BY lead_key
      )
      SELECT
        lr.lead_key,
        lr.lead_display,
        lr.first_seen::text,
        lr.quiz_started,
        lr.result_cta_clicked,
        lr.checkout_started,
        lr.payment_success,
        sm.step_answers
      FROM lead_rollup lr
      LEFT JOIN step_map sm ON sm.lead_key = lr.lead_key
      ORDER BY lr.first_seen DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<LeadCountRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT COALESCE(lead_id, session_id, anonymous_id, visitor_id) AS lead_key
        FROM events
        ${whereSql}
      )
      SELECT COUNT(DISTINCT lead_key)::int AS total
      FROM scoped
      WHERE lead_key IS NOT NULL
    `),
    prisma.$queryRaw<StepDataHealthRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'step_viewed')::int AS step_events,
        COUNT(*) FILTER (WHERE event_name = 'step_answered')::int AS answered_events
      FROM events
      ${whereSql}
    `),
  ]);

  const totals = totalsRows[0] ?? {
    visits: 0,
    sessions: 0,
    leads: 0,
    sales: 0,
    revenue: 0,
    conversion_rate: 0,
  };

  const revenue = Number(totals.revenue ?? 0);
  const conversionRate = Number(totals.conversion_rate ?? 0);

  const stageMap = new Map(stageRows.map((row) => [row.stage, Number(row.sessions ?? 0)]));
  const funnelStages = [
    { key: "traffic", label: "Tráfego", sessions: stageMap.get("traffic") ?? 0 },
    { key: "quiz_started", label: "Quiz Start", sessions: stageMap.get("quiz_started") ?? 0 },
    { key: "quiz_completed", label: "Quiz Complete", sessions: stageMap.get("quiz_completed") ?? 0 },
    { key: "checkout_started", label: "Checkout Start", sessions: stageMap.get("checkout_started") ?? 0 },
    { key: "payment_success", label: "Purchase", sessions: stageMap.get("payment_success") ?? 0 },
  ];
  const orderedFunnelStepRows = [...funnelStepRows].sort((a, b) => {
    const aOrder = getStepOrder(a.step_id);
    const bOrder = getStepOrder(b.step_id);
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.funnel_id !== b.funnel_id) return a.funnel_id.localeCompare(b.funnel_id);
    return a.step_id.localeCompare(b.step_id);
  });
  const funnels = ["all", ...funnelOptionsRows.map((r) => r.value ?? "unknown")];
  const sources = ["all", ...sourceOptionsRows.map((r) => r.value ?? "direct")];
  const totalLeads = Number(leadCountRows[0]?.total ?? 0);
  const stepDataHealth = stepDataHealthRows[0] ?? { step_events: 0, answered_events: 0 };
  const totalPages = Math.max(1, Math.ceil(totalLeads / perPage));
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const baseParams = new URLSearchParams();
  if (range) baseParams.set("range", range);
  if (month) baseParams.set("month", month);
  if (funnelFilter) baseParams.set("funnel", funnelFilter);
  if (sourceFilter) baseParams.set("source", sourceFilter);
  if (q) baseParams.set("q", q);
  for (const col of selectedStepColumns) baseParams.append("col", col);
  const exportParams = new URLSearchParams(baseParams);
  exportParams.set("format", "csv");

  return (
    <main className="min-h-dvh bg-gradient-to-b from-emerald-50/50 via-white to-neutral-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Tracking dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-pg-ink">Funil e receita (event-driven)</h1>
          <p className="mt-1 text-sm text-pg-ink/70">Visão agregada por eventos, pronta para ligar pixels/APIs externas.</p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs text-pg-ink/70">
              {hasNonDefaultFilters ? "Filtros ativos aplicados nesta vista." : "Sem filtros adicionais (vista padrão)."}
            </p>
            {hasNonDefaultFilters ? (
              <a
                href="/quizdashboard"
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-pg-ink hover:bg-neutral-50"
              >
                Limpar filtros
              </a>
            ) : null}
          </div>
          <details open={hasNonDefaultFilters}>
            <summary className="cursor-pointer list-none text-lg font-semibold text-pg-ink">
              Filtros e exportacao
            </summary>
            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Período</label>
              <select
                name="range"
                defaultValue={range}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="24h">24 horas</option>
                <option value="7d">7 dias</option>
                <option value="30d">30 dias</option>
                <option value="90d">90 dias</option>
                <option value="month">Mês específico</option>
                <option value="all">Todo histórico</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Mês (se selecionado)</label>
              <input
                type="month"
                name="month"
                defaultValue={month ?? ""}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Funil</label>
              <select
                name="funnel"
                defaultValue={funnelFilter}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {funnels.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Origem (utm_source)</label>
              <select
                name="source"
                defaultValue={sourceFilter}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {sources.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Buscar lead/sessão</label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="lead_id, session_id..."
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="md:col-span-5">
              <details className="rounded-xl border border-neutral-200 bg-white shadow-sm">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-pg-ink">
                  Colunas da tabela (etapas) - {selectedStepColumns.length} selecionadas
                </summary>
                <div className="border-t border-neutral-200 p-2">
                  <div className="max-h-28 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                      {QUIZ_STEP_COLUMNS.map((stepId) => (
                        <label key={stepId} className="inline-flex items-center gap-2 text-xs text-pg-ink">
                          <input
                            type="checkbox"
                            name="col"
                            value={stepId}
                            defaultChecked={selectedColumnsSet.has(stepId)}
                            className="h-3.5 w-3.5 rounded border-neutral-300"
                          />
                      <span>{getStepLabelWithNumber(stepId)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                Aplicar filtros
              </button>
            </div>
            <div className="flex items-end">
              <a
                href={`/api/events/export?${exportParams.toString()}`}
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-semibold text-pg-ink shadow-sm transition hover:bg-neutral-50"
              >
                Export CSV
              </a>
            </div>
            </form>
          </details>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Visitas</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{fmt(Number(totals.visits ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Sessões</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{fmt(Number(totals.sessions ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Leads</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{fmt(Number(totals.leads ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Vendas</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{fmt(Number(totals.sales ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Receita</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{euro(revenue)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Conversão</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{conversionRate.toFixed(2)}%</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-pg-ink">Funil principal (sessões)</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              {funnelStages.map((stage, idx) => {
                const prev = idx === 0 ? stage.sessions : funnelStages[idx - 1].sessions;
                const rate = prev === 0 ? 0 : (stage.sessions / prev) * 100;
                return (
                  <div key={stage.key} className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-3">
                    <p className="text-xs text-pg-ink/60">{stage.label}</p>
                    <p className="mt-1 text-2xl font-bold text-pg-ink">{fmt(stage.sessions)}</p>
                    <p className="mt-1 text-xs text-pg-ink/70">Taxa etapa: {rate.toFixed(2)}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-pg-ink">Resumo diário (`event_daily_agg`)</h2>
            <div className="mt-3 space-y-2">
              {dailyAggRows.length === 0 ? (
                <p className="text-sm text-pg-ink/70">Sem dados ainda.</p>
              ) : (
                dailyAggRows.map((row, idx) => (
                  <div key={`${row.date}-${row.funnel_id}-${row.utm_source}-${idx}`} className="rounded-xl border border-neutral-100 bg-neutral-50/50 px-3 py-2 text-sm">
                    <p className="font-semibold text-pg-ink">
                      {row.date} · {row.funnel_id} · {row.utm_source}
                    </p>
                    <p className="text-pg-ink/75">
                      eventos {fmt(Number(row.events ?? 0))} · sessões {fmt(Number(row.sessions ?? 0))} · leads{" "}
                      {fmt(Number(row.leads ?? 0))} · receita {euro(Number(row.revenue ?? 0))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <details>
              <summary className="cursor-pointer list-none text-lg font-semibold text-pg-ink">
                Etapas do funil (`funnel_step_agg`)
              </summary>
              <div className="mt-3 space-y-2">
                {funnelStepRows.length === 0 ? (
                  <p className="text-sm text-pg-ink/70">Sem dados ainda.</p>
                ) : (
                  orderedFunnelStepRows.map((row, idx) => (
                    <div key={`${row.funnel_id}-${row.step_id}-${idx}`} className="rounded-xl border border-neutral-100 bg-neutral-50/60 px-3 py-2 text-sm">
                      <p className="font-semibold text-pg-ink">
                        {row.funnel_id} · {getStepLabelWithNumber(row.step_id)}
                      </p>
                      <p className="text-pg-ink/75">
                        views {fmt(Number(row.views ?? 0))} · answers {fmt(Number(row.answers ?? 0))} · completions{" "}
                        {fmt(Number(row.completions ?? 0))} · drop {Number(row.drop_rate ?? 0).toFixed(2)}%
                      </p>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-pg-ink">Tabela por lead (todas as etapas do funil)</h2>
          <p className="mt-1 text-xs text-pg-ink/65">
            Mostra cada lead/sessão e o estado em cada etapa. Filtros acima aplicam em toda a tabela.
          </p>
          {Number(stepDataHealth.step_events ?? 0) === 0 ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Ainda não há eventos de etapa (`step_viewed`). Faz um teste real no `/quiz` (avança etapas e responde opções)
              para a tabela preencher as colunas.
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1900px] border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-50/70">
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Lead</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Data</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Quiz Iniciado</th>
                  {selectedStepColumns.map((stepId) => (
                    <th key={stepId} className="border border-neutral-200 px-2 py-2 text-left font-semibold">
                      {getStepLabelWithNumber(stepId)}
                    </th>
                  ))}
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Resultado CTA</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Checkout</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Compra</th>
                </tr>
              </thead>
              <tbody>
                {leadFunnelRows.length === 0 ? (
                  <tr>
                    <td colSpan={6 + selectedStepColumns.length} className="border border-neutral-200 px-3 py-6 text-center text-pg-ink/70">
                      Sem leads no período/filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  leadFunnelRows.map((row) => {
                    const stepAnswers = row.step_answers ?? {};
                    const exitStepId = getLeadExitStepId(stepAnswers, row.payment_success);
                    return (
                      <tr key={row.lead_key} className="odd:bg-white even:bg-emerald-50/20">
                        <td className="border border-neutral-200 px-2 py-2 font-semibold text-pg-ink">{row.lead_display}</td>
                        <td className="border border-neutral-200 px-2 py-2 text-pg-ink/80">
                          {formatLisbonDateTime(row.first_seen)}
                        </td>
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.quiz_started, "OK")}</td>
                        {selectedStepColumns.map((stepId) => (
                          <td
                            key={`${row.lead_key}-${stepId}`}
                            className={
                              exitStepId === stepId
                                ? "border border-red-300 bg-red-600 px-2 py-2 font-semibold text-white"
                                : "border border-neutral-200 px-2 py-2 text-pg-ink/80"
                            }
                          >
                            {stepAnswers[stepId] ?? "-"}
                          </td>
                        ))}
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.result_cta_clicked, "clicked")}</td>
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.checkout_started, "started")}</td>
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.payment_success, "paid")}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-pg-ink/75">
            <p>
              Leads: {fmt(totalLeads)} · Página {page} de {fmt(totalPages)}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`?${(() => {
                  const p = new URLSearchParams(baseParams);
                  p.set("page", String(prevPage));
                  return p.toString();
                })()}`}
                className="rounded-lg border border-neutral-300 px-3 py-1 hover:bg-neutral-50"
              >
                Anterior
              </a>
              <a
                href={`?${(() => {
                  const p = new URLSearchParams(baseParams);
                  p.set("page", String(nextPage));
                  return p.toString();
                })()}`}
                className="rounded-lg border border-neutral-300 px-3 py-1 hover:bg-neutral-50"
              >
                Seguinte
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
