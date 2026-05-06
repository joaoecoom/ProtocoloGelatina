import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMetricsPurgePostAllowed } from "@/lib/allow-metrics-purge";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FunnelAiPanel } from "./funnel-ai-panel";
import { MetricsPurgePanel, type MetricsPurgeLogDTO } from "./metrics-purge-panel";

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
  is_internal_test: boolean;
  step_answers: Record<string, string> | null;
  offer_decisions: Record<string, string> | null;
  offer_decision_path: string | null;
};
type LeadCountRow = { total: number };
/** Agregados globais de leads (não paginados), alinhados à vista «Leads» do construtor. */
type LeadMetricsAggRow = {
  visitantes: number;
  leads_total: number;
  leads_quiz_started: number;
  leads_qualificados: number;
  leads_quiz_completed: number;
  leads_checkout: number;
  leads_payment: number;
};
type StepDataHealthRow = {
  step_events: number;
  answered_events: number;
};
type LeadProgressRow = {
  row: LeadFunnelRow;
  stepAnswers: Record<string, string>;
  offerDecisions: Record<string, string>;
  maxReachedOrder: number;
};

const RANGE_TO_DAYS: Record<string, number> = {
  "3d": 3,
  "7d": 7,
  "30d": 30,
  "24h": 1,
  "90d": 90,
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;
const DEFAULT_RANGE = "today";
const DEFAULT_PER = "max";

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
  "checkout-upsell-2",
  "checkout-downsell-2-1",
  "checkout-downsell-2-2",
  "checkout-thank-you",
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
  "checkout-upsell-2": "Checkout - Upsell 2",
  "checkout-downsell-2-1": "Checkout - Downsell 2.1",
  "checkout-downsell-2-2": "Checkout - Downsell 2.2",
  "checkout-thank-you": "Checkout - Obrigado",
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

function getLeadMaxReachedOrder(params: {
  stepAnswers: Record<string, string>;
  quizStarted: boolean;
  resultCtaClicked: boolean;
  checkoutStarted: boolean;
  paymentSuccess: boolean;
}) {
  const { stepAnswers, quizStarted, resultCtaClicked, checkoutStarted, paymentSuccess } = params;
  let maxOrder = -1;

  for (const stepId of Object.keys(stepAnswers)) {
    if (!stepAnswers[stepId]) continue;
    maxOrder = Math.max(maxOrder, getStepOrder(stepId));
  }

  if (quizStarted) maxOrder = Math.max(maxOrder, getStepOrder("intro"));
  if (resultCtaClicked) maxOrder = Math.max(maxOrder, getStepOrder("final-sales"));
  if (checkoutStarted) maxOrder = Math.max(maxOrder, getStepOrder("checkout-front"));
  if (paymentSuccess) maxOrder = Math.max(maxOrder, getStepOrder("checkout-thank-you"));

  return maxOrder;
}

const CHECKOUT_OFFER_STEPS = [
  "checkout-upsell-1",
  "checkout-downsell-1-1",
  "checkout-downsell-1-2",
  "checkout-upsell-2",
  "checkout-downsell-2-1",
  "checkout-downsell-2-2",
] as const;

function decisionBadge(decision: string | null | undefined) {
  if (!decision) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">-</span>;
  }
  if (decision === "accepted") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">aceitou</span>;
  }
  if (decision === "rejected") {
    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">rejeitou</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{decision}</span>;
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

  const range = sp.get("range") ?? DEFAULT_RANGE;
  const month = sp.get("month");
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const perParamRaw = (sp.get("per") ?? DEFAULT_PER).toLowerCase();
  const perParam = Number(perParamRaw);
  const perMode: "max" | "paged" =
    perParamRaw === "max" ||
    !PAGE_SIZE_OPTIONS.includes(perParam as (typeof PAGE_SIZE_OPTIONS)[number])
      ? "max"
      : "paged";
  const perPage = perMode === "max" ? 1000000 : perParam;
  const offset = (page - 1) * perPage;
  const funnelFilter = sp.get("funnel") ?? "all";
  const sourceFilter = sp.get("source") ?? "all";
  const days = RANGE_TO_DAYS[range];
  const selectedColumnsSet = new Set(
    selectedColParams.length > 0 ? selectedColParams : [...QUIZ_STEP_COLUMNS],
  );
  const selectedStepColumns = QUIZ_STEP_COLUMNS.filter((col) => selectedColumnsSet.has(col));
  const hasNonDefaultFilters =
    range !== DEFAULT_RANGE ||
    Boolean(month) ||
    perMode !== DEFAULT_PER ||
    funnelFilter !== "all" ||
    sourceFilter !== "all" ||
    q.length > 0 ||
    selectedStepColumns.length !== QUIZ_STEP_COLUMNS.length;

  const whereParts: Prisma.Sql[] = [];
  if (range === "today") {
    whereParts.push(
      Prisma.sql`("timestamp" AT TIME ZONE 'Europe/Lisbon')::date = (NOW() AT TIME ZONE 'Europe/Lisbon')::date`,
    );
  } else if (range === "yesterday") {
    whereParts.push(
      Prisma.sql`("timestamp" AT TIME ZONE 'Europe/Lisbon')::date = ((NOW() AT TIME ZONE 'Europe/Lisbon')::date - INTERVAL '1 day')::date`,
    );
  } else if (range === "month" && month && /^\d{4}-\d{2}$/.test(month)) {
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
  const wherePartsMetrics = [
    ...whereParts,
    Prisma.sql`COALESCE(metadata_json->>'traffic_type', '') <> 'internal_test'`,
  ];
  const whereSqlMetrics = Prisma.sql`WHERE ${Prisma.join(wherePartsMetrics, " AND ")}`;
  const minStepsQualificado = Math.max(1, Math.ceil(QUIZ_STEP_COLUMNS.length * 0.5));

  const [
    totalsRows,
    dailyAggRows,
    funnelStepRows,
    stageRows,
    funnelOptionsRows,
    sourceOptionsRows,
    leadFunnelRows,
    leadCountRows,
    stepDataHealthRows,
    leadMetricsRows,
  ] = await Promise.all([
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
      ${whereSqlMetrics}
    `),
    prisma.$queryRaw<DailyAggRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *
        FROM events
        ${whereSqlMetrics}
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
        ${whereSqlMetrics}
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
        ${whereSqlMetrics}
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
      latest_decisions AS (
        SELECT DISTINCT ON (lead_key, COALESCE(metadata_json->>'checkout_stage', step_id, 'unknown'))
          lead_key,
          COALESCE(metadata_json->>'checkout_stage', step_id, 'unknown') AS checkout_stage,
          COALESCE(
            metadata_json->>'decision',
            CASE
              WHEN event_name LIKE '%_accepted' THEN 'accepted'
              WHEN event_name LIKE '%_rejected' THEN 'rejected'
              ELSE event_name
            END
          ) AS decision,
          "timestamp"
        FROM scoped
        WHERE event_name IN ('upsell_accepted', 'upsell_rejected', 'downsell_accepted', 'downsell_rejected')
        ORDER BY lead_key, COALESCE(metadata_json->>'checkout_stage', step_id, 'unknown'), "timestamp" DESC
      ),
      decision_map AS (
        SELECT
          lead_key,
          jsonb_object_agg(checkout_stage, decision) AS offer_decisions
        FROM latest_decisions
        GROUP BY lead_key
      ),
      decision_path AS (
        SELECT
          lead_key,
          string_agg(
            CONCAT(checkout_stage, ':', decision),
            ' > '
            ORDER BY "timestamp" ASC
          ) AS offer_decision_path
        FROM latest_decisions
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
          BOOL_OR(event_name = 'payment_success') AS payment_success,
          BOOL_OR(COALESCE(metadata_json->>'traffic_type', '') = 'internal_test') AS is_internal_test
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
        lr.is_internal_test,
        sm.step_answers,
        dm.offer_decisions,
        dp.offer_decision_path
      FROM lead_rollup lr
      LEFT JOIN step_map sm ON sm.lead_key = lr.lead_key
      LEFT JOIN decision_map dm ON dm.lead_key = lr.lead_key
      LEFT JOIN decision_path dp ON dp.lead_key = lr.lead_key
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
      ${whereSqlMetrics}
    `),
    prisma.$queryRaw<LeadMetricsAggRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *,
          COALESCE(lead_id, session_id, anonymous_id, visitor_id) AS lead_key
        FROM events
        ${whereSqlMetrics}
      ),
      visitantes AS (
        SELECT COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::int AS c
        FROM scoped
        WHERE event_name IN ('page_view', 'landing_view')
      ),
      lead_rollup AS (
        SELECT
          lead_key,
          BOOL_OR(event_name = 'quiz_started') AS quiz_started,
          BOOL_OR(event_name = 'quiz_completed') AS quiz_completed,
          BOOL_OR(event_name = 'checkout_started') AS checkout_started,
          BOOL_OR(event_name = 'payment_success') AS payment_success,
          BOOL_OR(COALESCE(metadata_json->>'traffic_type', '') = 'internal_test') AS is_internal_test,
          COUNT(DISTINCT CASE WHEN event_name = 'step_answered' AND step_id IS NOT NULL THEN step_id END)::int AS steps_answered
        FROM scoped
        WHERE lead_key IS NOT NULL
        GROUP BY lead_key
      )
      SELECT
        (SELECT c FROM visitantes) AS visitantes,
        COUNT(*) FILTER (WHERE NOT is_internal_test)::int AS leads_total,
        COUNT(*) FILTER (WHERE NOT is_internal_test AND quiz_started)::int AS leads_quiz_started,
        COUNT(*) FILTER (WHERE NOT is_internal_test AND quiz_started AND steps_answered >= ${minStepsQualificado})::int AS leads_qualificados,
        COUNT(*) FILTER (WHERE NOT is_internal_test AND quiz_completed)::int AS leads_quiz_completed,
        COUNT(*) FILTER (WHERE NOT is_internal_test AND checkout_started)::int AS leads_checkout,
        COUNT(*) FILTER (WHERE NOT is_internal_test AND payment_success)::int AS leads_payment
      FROM lead_rollup
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

  const leadAgg = leadMetricsRows[0] ?? {
    visitantes: 0,
    leads_total: 0,
    leads_quiz_started: 0,
    leads_qualificados: 0,
    leads_quiz_completed: 0,
    leads_checkout: 0,
    leads_payment: 0,
  };
  const leadVisitantes = Number(leadAgg.visitantes ?? 0);
  const leadsAdquiridos = Number(leadAgg.leads_quiz_started ?? 0);
  const leadQualificados = Number(leadAgg.leads_qualificados ?? 0);
  const leadQuizCompleted = Number(leadAgg.leads_quiz_completed ?? 0);
  const leadCheckout = Number(leadAgg.leads_checkout ?? 0);
  const leadPayment = Number(leadAgg.leads_payment ?? 0);
  const taxaInteracaoPct = leadVisitantes === 0 ? 0 : (leadsAdquiridos / leadVisitantes) * 100;
  const pctAdquiridosComCheckout = leadsAdquiridos === 0 ? 0 : (leadCheckout / leadsAdquiridos) * 100;
  const retencaoQuizCompletoPct = leadsAdquiridos === 0 ? 0 : (leadQuizCompleted / leadsAdquiridos) * 100;
  const conversaoCheckoutPct = leadCheckout === 0 ? 0 : (leadPayment / leadCheckout) * 100;
  const pctQualificadosSobreAdquiridos = leadsAdquiridos === 0 ? 0 : (leadQualificados / leadsAdquiridos) * 100;

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
  baseParams.set("per", perMode === "max" ? "max" : String(perPage));
  if (funnelFilter) baseParams.set("funnel", funnelFilter);
  if (sourceFilter) baseParams.set("source", sourceFilter);
  if (q) baseParams.set("q", q);
  for (const col of selectedStepColumns) baseParams.append("col", col);
  const exportParams = new URLSearchParams(baseParams);
  exportParams.set("format", "csv");

  let purgeLogs: MetricsPurgeLogDTO[] = [];
  let purgeLogsUnavailable = false;
  try {
    const rows = await prisma.metricsPurgeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        createdAt: true,
        createdByEmail: true,
        scope: true,
        eventsRemoved: true,
        summaryBefore: true,
        label: true,
      },
    });
    purgeLogs = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    purgeLogsUnavailable = true;
  }

  const highlightResetIdRaw = sp.get("reset")?.trim();
  const highlightResetId =
    highlightResetIdRaw && highlightResetIdRaw.length <= 40 ? highlightResetIdRaw : undefined;

  const offerDecisionRollup = new Map<string, { accepted: number; rejected: number }>();
  for (const row of leadFunnelRows) {
    const decisions = row.offer_decisions ?? {};
    for (const [stage, decision] of Object.entries(decisions)) {
      if (decision !== "accepted" && decision !== "rejected") continue;
      const current = offerDecisionRollup.get(stage) ?? { accepted: 0, rejected: 0 };
      if (decision === "accepted") current.accepted += 1;
      if (decision === "rejected") current.rejected += 1;
      offerDecisionRollup.set(stage, current);
    }
  }

  function decisionRate(stage: string) {
    const totals = offerDecisionRollup.get(stage) ?? { accepted: 0, rejected: 0 };
    const base = totals.accepted + totals.rejected;
    const rate = base === 0 ? 0 : (totals.accepted / base) * 100;
    return { ...totals, rate };
  }

  const upsell1Rate = decisionRate("upsell1");
  const upsell2Rate = decisionRate("upsell2");
  const topRejection = Array.from(offerDecisionRollup.entries())
    .map(([stage, totals]) => ({ stage, rejected: totals.rejected }))
    .sort((a, b) => b.rejected - a.rejected)[0] ?? { stage: "-", rejected: 0 };
  const internalTestLeads = leadFunnelRows.filter((row) => row.is_internal_test).length;
  const leadProgressRows: LeadProgressRow[] = leadFunnelRows.map((row) => {
    const stepAnswers = row.step_answers ?? {};
    return {
      row,
      stepAnswers,
      offerDecisions: row.offer_decisions ?? {},
      maxReachedOrder: getLeadMaxReachedOrder({
        stepAnswers,
        quizStarted: row.quiz_started,
        resultCtaClicked: row.result_cta_clicked,
        checkoutStarted: row.checkout_started,
        paymentSuccess: row.payment_success,
      }),
    };
  });
  const baselineLeads = leadProgressRows.filter((r) => r.maxReachedOrder >= 0).length;
  const stepPassageRates = QUIZ_STEP_COLUMNS.map((stepId, idx) => {
    const reached = leadProgressRows.filter((r) => r.maxReachedOrder >= idx).length;
    const prevReached = idx === 0 ? baselineLeads : leadProgressRows.filter((r) => r.maxReachedOrder >= idx - 1).length;
    return {
      stepId,
      reached,
      fromStartRate: baselineLeads === 0 ? 0 : (reached / baselineLeads) * 100,
      fromPreviousRate: prevReached === 0 ? 0 : (reached / prevReached) * 100,
    };
  });

  const funnelStagePtLabels: Record<string, string> = {
    traffic: "Tráfego",
    quiz_started: "Início do quiz",
    quiz_completed: "Quiz completo",
    checkout_started: "Checkout",
    payment_success: "Compra",
  };
  const stageLosses = funnelStages.map((stage, idx) => {
    const prev = idx === 0 ? stage.sessions : funnelStages[idx - 1]!.sessions;
    const retentionPct = prev === 0 ? 0 : (stage.sessions / prev) * 100;
    const lossPct = prev === 0 ? 0 : Math.max(0, 100 - retentionPct);
    return {
      stageKey: stage.key,
      stageLabel: funnelStagePtLabels[stage.key] ?? stage.label,
      sessions: stage.sessions,
      retentionPct: Number(retentionPct.toFixed(2)),
      lossPct: Number(lossPct.toFixed(2)),
    };
  });
  const topStepLosses = stepPassageRates
    .map((s) => ({
      stepId: s.stepId,
      stepLabel: getStepLabelWithNumber(s.stepId),
      reached: s.reached,
      fromPreviousRate: Number(s.fromPreviousRate.toFixed(2)),
      lossVsPrevious: Number(Math.max(0, 100 - s.fromPreviousRate).toFixed(2)),
    }))
    .filter((s, idx) => idx > 0)
    .sort((a, b) => b.lossVsPrevious - a.lossVsPrevious)
    .slice(0, 8);
  const aiPayload = {
    generatedAt: new Date().toISOString(),
    filters: {
      range,
      month: month ?? null,
      funnel: funnelFilter,
      source: sourceFilter,
      query: q || null,
    },
    totals: {
      visits: Number(totals.visits ?? 0),
      sessions: Number(totals.sessions ?? 0),
      leads: Number(totals.leads ?? 0),
      sales: Number(totals.sales ?? 0),
      conversionRatePct: Number(conversionRate.toFixed(2)),
    },
    leadMetrics: {
      visitantes: leadVisitantes,
      leadsAdquiridos,
      leadsQualificados: leadQualificados,
      leadsQuizCompleted: leadQuizCompleted,
      leadsCheckout: leadCheckout,
      leadsPayment: leadPayment,
      taxaInteracaoPct: Number(taxaInteracaoPct.toFixed(2)),
      retencaoQuizCompletoPct: Number(retencaoQuizCompletoPct.toFixed(2)),
      conversaoCheckoutPct: Number(conversaoCheckoutPct.toFixed(2)),
    },
    stageLosses,
    topStepLosses,
  };

  return (
    <main
      id="quizdashboard-dark"
      className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6"
    >
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Tracking dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-pg-ink">Funil e receita (event-driven)</h1>
          <p className="mt-1 text-sm text-pg-ink/70">Visão agregada por eventos, pronta para ligar pixels/APIs externas.</p>
          <p className="mt-1 text-xs font-semibold text-sky-700">
            Tráfego de teste interno está excluído dos cards/métricas. Na tabela por lead, aparece em azul claro.
          </p>
        </header>

        <MetricsPurgePanel
          initialLogs={purgeLogs}
          exportHref={`/api/events/export?${exportParams.toString()}`}
          tableUnavailable={purgeLogsUnavailable}
          purgePostAllowed={isMetricsPurgePostAllowed()}
          highlightResetId={highlightResetId}
        />

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
          <details>
            <summary className="cursor-pointer list-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-pg-ink">
              Expandir filtros e exportação
            </summary>
            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Período</label>
              <select
                name="range"
                defaultValue={range}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="3d">Últimos 3 dias</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="24h">24 horas</option>
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
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Itens por página</label>
              <select
                name="per"
                defaultValue={perMode === "max" ? "max" : String(perPage)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
                <option value="max">Máximo</option>
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

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <details>
            <summary className="cursor-pointer list-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-pg-ink">
              Expandir métricas da Vista Leads
            </summary>

            <div className="mt-4">
              <div className="mb-4 border-b border-neutral-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Vista leads</p>
                <h2 className="text-lg font-semibold text-pg-ink">Métricas do funil (organização tipo construtor)</h2>
                <p className="mt-1 text-xs text-pg-ink/65">
                  Agregados globais com os filtros actuais. Tráfego de teste interno excluído. Qualificados: leads que
                  responderam ≥ {minStepsQualificado} etapas (≥ metade de {QUIZ_STEP_COLUMNS.length} passos do quiz).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="text-xl text-neutral-400" aria-hidden>
                ◉
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pg-ink">Visitantes</p>
                <p className="text-xs text-pg-ink/65">Sessões que viram página / entrada do funil.</p>
              </div>
              <p className="text-right text-2xl font-bold tabular-nums text-pg-ink">{fmt(leadVisitantes)}</p>
            </div>
            <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="text-xl text-neutral-400" aria-hidden>
                ◎
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pg-ink">Leads adquiridos</p>
                <p className="text-xs text-pg-ink/65">Iniciaram o quiz (evento quiz_started).</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-pg-ink">{fmt(leadsAdquiridos)}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {pctAdquiridosComCheckout.toFixed(1)}% chegam ao checkout
                </p>
              </div>
            </div>
            <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="text-lg font-semibold text-neutral-400" aria-hidden>
                ↗
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pg-ink">Taxa de interação</p>
                <p className="text-xs text-pg-ink/65">Visitantes que viraram lead (iniciaram quiz).</p>
              </div>
              <p className="text-right text-2xl font-bold tabular-nums text-pg-ink">{taxaInteracaoPct.toFixed(1)}%</p>
            </div>
            <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="text-xl text-neutral-400" aria-hidden>
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pg-ink">Leads qualificados</p>
                <p className="text-xs text-pg-ink/65">Responderam a pelo menos metade das etapas do quiz.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-pg-ink">{fmt(leadQualificados)}</p>
                <p className="mt-1 text-xs text-pg-ink/60">{pctQualificadosSobreAdquiridos.toFixed(1)}% dos adquiridos</p>
              </div>
            </div>
            <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
              <span className="text-xl text-neutral-400" aria-hidden>
                ☑
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-pg-ink">Fluxos completos (quiz)</p>
                <p className="text-xs text-pg-ink/65">Concluíram o quiz (evento quiz_completed).</p>
              </div>
              <p className="text-right text-2xl font-bold tabular-nums text-pg-ink">{fmt(leadQuizCompleted)}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200">
            <table className="min-w-full text-left text-sm">
              <caption className="border-b border-neutral-100 bg-neutral-50 px-3 py-2 text-left text-xs font-semibold text-pg-ink/80">
                Indicadores calculados automaticamente (mesmos filtros)
              </caption>
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold text-pg-ink/70">
                <tr>
                  <th className="px-3 py-2">Indicador</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="px-3 py-2 font-medium text-pg-ink">Taxa de interação</td>
                  <td className="px-3 py-2 tabular-nums">{taxaInteracaoPct.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-xs text-pg-ink/70">Leads adquiridos ÷ visitantes</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-pg-ink">Retenção (quiz iniciado → quiz completo)</td>
                  <td className="px-3 py-2 tabular-nums">{retencaoQuizCompletoPct.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-xs text-pg-ink/70">Entre leads com quiz_started</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-pg-ink">Passam para o checkout</td>
                  <td className="px-3 py-2 tabular-nums">
                    {fmt(leadCheckout)}{" "}
                    <span className="text-xs text-pg-ink/65">
                      ({pctAdquiridosComCheckout.toFixed(1)}% dos adquiridos)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-pg-ink/70">Leads com checkout_started</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-pg-ink">Conversão checkout</td>
                  <td className="px-3 py-2 tabular-nums">{conversaoCheckoutPct.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-xs text-pg-ink/70">Compras (payment_success) ÷ iniciaram checkout</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-pg-ink">Compras confirmadas</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(leadPayment)}</td>
                  <td className="px-3 py-2 text-xs text-pg-ink/70">Leads com pagamento concluído</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-pg-ink">Perda entre etapas (sessões · funil principal)</h3>
            <p className="mt-1 text-xs text-pg-ink/65">
              Percentagem deixada de avançar em relação à etapa anterior (mesma base que «Funil principal» abaixo).
            </p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-pg-ink/70">
                  <tr>
                    <th className="px-3 py-2">Etapa</th>
                    <th className="px-3 py-2">Sessões</th>
                    <th className="px-3 py-2">Retenção vs anterior</th>
                    <th className="px-3 py-2">Perda vs anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {funnelStages.map((stage, idx) => {
                    const prev = idx === 0 ? stage.sessions : funnelStages[idx - 1]!.sessions;
                    const rate = prev === 0 ? 0 : (stage.sessions / prev) * 100;
                    const loss = prev === 0 ? 0 : Math.max(0, 100 - rate);
                    return (
                      <tr key={stage.key}>
                        <td className="px-3 py-2 font-medium text-pg-ink">
                          {funnelStagePtLabels[stage.key] ?? stage.label}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{fmt(stage.sessions)}</td>
                        <td className="px-3 py-2 tabular-nums text-emerald-800">{rate.toFixed(2)}%</td>
                        <td className="px-3 py-2 tabular-nums text-rose-700">{loss.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

              <p className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs text-pg-ink/80">
                <span className="font-semibold text-pg-ink">Comportamento do lead no funil:</span> não há gravação de
                ecrã. Usa a tabela «Progresso por lead» mais abaixo para ver passos, ofertas e checkout por identificador.
              </p>
            </div>
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

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Taxa de aceitação · Upsell 1</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{upsell1Rate.rate.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-pg-ink/70">
              Aceites {fmt(upsell1Rate.accepted)} · Rejeições {fmt(upsell1Rate.rejected)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Taxa de aceitação · Upsell 2</p>
            <p className="mt-1 text-2xl font-bold text-pg-ink">{upsell2Rate.rate.toFixed(2)}%</p>
            <p className="mt-1 text-xs text-pg-ink/70">
              Aceites {fmt(upsell2Rate.accepted)} · Rejeições {fmt(upsell2Rate.rejected)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-pg-ink/65">Top ponto de rejeição</p>
            <p className="mt-1 text-lg font-bold text-pg-ink">{getStepLabel(topRejection.stage)}</p>
            <p className="mt-1 text-xs text-pg-ink/70">Rejeições: {fmt(topRejection.rejected)}</p>
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
            <details>
              <summary className="cursor-pointer list-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-pg-ink">
                Expandir resumo diário (`event_daily_agg`)
              </summary>
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
            </details>
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
          <details>
            <summary className="cursor-pointer list-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-pg-ink">
              Expandir taxa de passagem por etapa (início ao fim)
            </summary>
            <p className="mt-3 text-xs text-pg-ink/65">
              Cálculo cumulativo: se 5 entraram e 4 chegaram à etapa seguinte, a passagem é 80%.
            </p>
            <div className="mt-3 overflow-x-auto">
            <table className="min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="bg-emerald-50/70">
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Etapa</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Leads que chegaram</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">% desde o início</th>
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">% vs etapa anterior</th>
                </tr>
              </thead>
              <tbody>
                {stepPassageRates.map((step) => (
                  <tr key={step.stepId} className="odd:bg-white even:bg-emerald-50/20">
                    <td className="border border-neutral-200 px-2 py-2 text-pg-ink">{getStepLabelWithNumber(step.stepId)}</td>
                    <td className="border border-neutral-200 px-2 py-2 text-pg-ink">{fmt(step.reached)}</td>
                    <td className="border border-neutral-200 px-2 py-2 text-pg-ink">{step.fromStartRate.toFixed(2)}%</td>
                    <td className="border border-neutral-200 px-2 py-2 text-pg-ink">{step.fromPreviousRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <FunnelAiPanel payload={aiPayload} />
          </details>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <details>
            <summary className="cursor-pointer list-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-pg-ink">
              Expandir tabela por lead (todas as etapas do funil)
            </summary>
            <h2 className="mt-3 text-lg font-semibold text-pg-ink">Tabela por lead (todas as etapas do funil)</h2>
            <p className="mt-1 text-xs text-pg-ink/65">
              Mostra cada lead/sessão e o estado em cada etapa. Se faltar um evento intermédio, a tabela infere "passou*"
              quando já existe evento numa etapa posterior.
            </p>
            <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input type="hidden" name="funnel" value={funnelFilter} />
            <input type="hidden" name="source" value={sourceFilter} />
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="month" value={month ?? ""} />
            {selectedStepColumns.map((col) => (
              <input key={`lead-table-col-${col}`} type="hidden" name="col" value={col} />
            ))}
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Período da tabela</label>
              <select
                name="range"
                defaultValue={range}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="3d">Últimos 3 dias</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="24h">24 horas</option>
                <option value="90d">90 dias</option>
                <option value="month">Mês específico</option>
                <option value="all">Todo histórico</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-pg-ink/70">Itens por página</label>
              <select
                name="per"
                defaultValue={perMode === "max" ? "max" : String(perPage)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={`lead-table-size-${size}`} value={size}>
                    {size}
                  </option>
                ))}
                <option value="max">Máximo</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-pg-ink shadow-sm transition hover:bg-neutral-50"
              >
                Aplicar nesta tabela
              </button>
            </div>
            </form>
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
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Decisões de oferta</th>
                  {CHECKOUT_OFFER_STEPS.map((stepId) => (
                    <th key={stepId} className="border border-neutral-200 px-2 py-2 text-left font-semibold">
                      {getStepLabel(stepId)}
                    </th>
                  ))}
                  <th className="border border-neutral-200 px-2 py-2 text-left font-semibold">Compra</th>
                </tr>
              </thead>
              <tbody>
                {leadFunnelRows.length === 0 ? (
                  <tr>
                    <td colSpan={7 + selectedStepColumns.length + CHECKOUT_OFFER_STEPS.length} className="border border-neutral-200 px-3 py-6 text-center text-pg-ink/70">
                      Sem leads no período/filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  leadProgressRows.map(({ row, stepAnswers, offerDecisions, maxReachedOrder }) => {
                    const exitStepId = getLeadExitStepId(stepAnswers, row.payment_success);
                    return (
                      <tr
                        key={row.lead_key}
                        className={
                          row.is_internal_test
                            ? "bg-sky-50"
                            : "odd:bg-white even:bg-emerald-50/20"
                        }
                      >
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
                            {stepAnswers[stepId] ?? (getStepOrder(stepId) <= maxReachedOrder ? "passou*" : "-")}
                          </td>
                        ))}
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.result_cta_clicked, "clicked")}</td>
                        <td className="border border-neutral-200 px-2 py-2">{statusBadge(row.checkout_started, "started")}</td>
                        <td className="border border-neutral-200 px-2 py-2 text-xs text-pg-ink/80">
                          {row.offer_decision_path ? row.offer_decision_path : "-"}
                        </td>
                        {CHECKOUT_OFFER_STEPS.map((stepId) => (
                          <td key={`${row.lead_key}-decision-${stepId}`} className="border border-neutral-200 px-2 py-2">
                            {decisionBadge(offerDecisions[stepId])}
                          </td>
                        ))}
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
              Leads: {fmt(totalLeads)} · Teste interno: {fmt(internalTestLeads)} · Página {page} de {fmt(totalPages)}
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
          </details>
        </section>
      </div>
      <style>{`
        #quizdashboard-dark section,
        #quizdashboard-dark details > summary,
        #quizdashboard-dark .rounded-2xl,
        #quizdashboard-dark .rounded-xl {
          border-color: #334155 !important;
        }
        #quizdashboard-dark section {
          background-color: #0f172a !important;
        }
        #quizdashboard-dark .bg-white,
        #quizdashboard-dark .bg-white\\/95,
        #quizdashboard-dark .bg-white\\/80 {
          background-color: #111827 !important;
          color: #e5e7eb !important;
        }
        #quizdashboard-dark .bg-neutral-50,
        #quizdashboard-dark .bg-neutral-50\\/50,
        #quizdashboard-dark .bg-neutral-50\\/60,
        #quizdashboard-dark .bg-neutral-50\\/70,
        #quizdashboard-dark .bg-neutral-50\\/80 {
          background-color: #1f2937 !important;
        }
        #quizdashboard-dark .bg-emerald-50\\/20,
        #quizdashboard-dark .bg-emerald-50\\/60,
        #quizdashboard-dark .bg-emerald-50\\/70 {
          background-color: #1f2937 !important;
        }
        #quizdashboard-dark .text-pg-ink,
        #quizdashboard-dark .text-pg-ink\\/80,
        #quizdashboard-dark .text-pg-ink\\/75,
        #quizdashboard-dark .text-pg-ink\\/70,
        #quizdashboard-dark .text-pg-ink\\/65,
        #quizdashboard-dark .text-pg-ink\\/60 {
          color: #e5e7eb !important;
        }
        #quizdashboard-dark thead,
        #quizdashboard-dark th {
          background-color: #1f2937 !important;
          color: #f8fafc !important;
        }
        #quizdashboard-dark td,
        #quizdashboard-dark th {
          border-color: #334155 !important;
        }
        #quizdashboard-dark input,
        #quizdashboard-dark select,
        #quizdashboard-dark textarea {
          background-color: #111827 !important;
          color: #f8fafc !important;
          border-color: #334155 !important;
        }
        #quizdashboard-dark a.rounded-lg,
        #quizdashboard-dark button.rounded-lg,
        #quizdashboard-dark button.rounded-xl,
        #quizdashboard-dark a.rounded-xl {
          border-color: #475569 !important;
        }
        #quizdashboard-dark pre {
          background-color: #0b1220 !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        #quizdashboard-dark .bg-gradient-to-b {
          background-image: none !important;
          background-color: #1e293b !important;
        }
        #quizdashboard-dark .odd\\:bg-white:nth-child(odd) {
          background-color: #1f2937 !important;
        }
        #quizdashboard-dark .even\\:bg-emerald-50\\/20:nth-child(even) {
          background-color: #374151 !important;
        }
        #quizdashboard-dark .bg-sky-50 {
          background-color: #1e3a5f !important;
        }
        #quizdashboard-dark td {
          color: #e5e7eb !important;
        }
        #quizdashboard-dark table tbody tr:hover td {
          background-color: #475569 !important;
        }
      `}</style>
    </main>
  );
}
