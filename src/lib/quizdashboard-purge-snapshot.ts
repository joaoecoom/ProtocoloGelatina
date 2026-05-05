import { Prisma } from "@prisma/client";

export const FUNNEL_QUIZ = "quiz_gelatina";
export type PurgeScope = "quiz_gelatina" | "all";

/** Snapshot guardado antes do purge (alinhado com os cards do dashboard). */
export type MetricsPurgeSnapshotV1 = {
  schemaVersion: 1;
  scope: PurgeScope;
  capturedAt: string;
  note: string;
  raw: {
    totalEvents: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    byEventName: Record<string, number>;
    byFunnelId: Record<string, number>;
  };
  /** Mesma lógica dos cards: exclui `metadata_json.traffic_type = internal_test`. */
  dashboardCards: {
    totals: {
      visits: number;
      sessions: number;
      leads: number;
      sales: number;
      revenue: number;
      conversion_rate: number;
    };
    stages: { stage: string; sessions: number }[];
    funnelSteps: {
      funnel_id: string;
      step_id: string;
      views: number;
      answers: number;
      completions: number;
      drop_rate: number;
    }[];
    stepDataHealth: {
      step_events: number;
      answered_events: number;
    };
  };
};

type TotalsRow = {
  visits: number;
  sessions: number;
  leads: number;
  sales: number;
  revenue: string | number;
  conversion_rate: string | number;
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

type StepDataHealthRow = {
  step_events: number;
  answered_events: number;
};

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function eventWhereForScope(scope: PurgeScope): Prisma.EventWhereInput {
  if (scope === "quiz_gelatina") {
    return { funnelId: FUNNEL_QUIZ };
  }
  return {};
}

function metricsWhereParts(scope: PurgeScope): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [
    Prisma.sql`COALESCE(metadata_json->>'traffic_type', '') <> 'internal_test'`,
  ];
  if (scope === "quiz_gelatina") {
    parts.unshift(Prisma.sql`funnel_id = ${FUNNEL_QUIZ}`);
  }
  return parts;
}

function metricsWhereSql(scope: PurgeScope): Prisma.Sql {
  return Prisma.sql`WHERE ${Prisma.join(metricsWhereParts(scope), " AND ")}`;
}

async function buildRawDeleteSummary(
  tx: Prisma.TransactionClient,
  where: Prisma.EventWhereInput,
): Promise<MetricsPurgeSnapshotV1["raw"]> {
  const [total, bounds, byName, byFunnel] = await Promise.all([
    tx.event.count({ where }),
    tx.event.aggregate({
      where,
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
    tx.event.groupBy({
      by: ["eventName"],
      where,
      _count: { _all: true },
    }),
    tx.event.groupBy({
      by: ["funnelId"],
      where,
      _count: { _all: true },
    }),
  ]);

  const byEventName = Object.fromEntries(byName.map((r) => [r.eventName, r._count._all]));
  const byFunnelId = Object.fromEntries(byFunnel.map((r) => [r.funnelId ?? "(null)", r._count._all]));

  return {
    totalEvents: total,
    firstTimestamp: bounds._min.timestamp?.toISOString() ?? null,
    lastTimestamp: bounds._max.timestamp?.toISOString() ?? null,
    byEventName,
    byFunnelId,
  };
}

export async function buildPurgeSnapshot(
  tx: Prisma.TransactionClient,
  scope: PurgeScope,
): Promise<MetricsPurgeSnapshotV1> {
  const where = eventWhereForScope(scope);
  const mWhere = metricsWhereSql(scope);

  const [raw, totalsRows, funnelStepRows, stageRows, stepDataHealthRows] = await Promise.all([
    buildRawDeleteSummary(tx, where),
    tx.$queryRaw<TotalsRow[]>(Prisma.sql`
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
      ${mWhere}
    `),
    tx.$queryRaw<FunnelStepRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT *
        FROM events
        ${mWhere}
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
    tx.$queryRaw<StageRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT COALESCE(session_id, anonymous_id, visitor_id) AS sid, event_name
        FROM events
        ${mWhere}
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
    tx.$queryRaw<StepDataHealthRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'step_viewed')::int AS step_events,
        COUNT(*) FILTER (WHERE event_name = 'step_answered')::int AS answered_events
      FROM events
      ${mWhere}
    `),
  ]);

  const t = totalsRows[0];
  const stepH = stepDataHealthRows[0] ?? { step_events: 0, answered_events: 0 };

  return {
    schemaVersion: 1,
    scope,
    capturedAt: new Date().toISOString(),
    note:
      "dashboardCards usa o mesmo critério dos cards do quizdashboard (exclui tráfego internal_test). raw conta todos os eventos que serão apagados neste âmbito.",
    raw,
    dashboardCards: {
      totals: {
        visits: num(t?.visits),
        sessions: num(t?.sessions),
        leads: num(t?.leads),
        sales: num(t?.sales),
        revenue: num(t?.revenue),
        conversion_rate: num(t?.conversion_rate),
      },
      stages: stageRows.map((r) => ({ stage: r.stage, sessions: num(r.sessions) })),
      funnelSteps: funnelStepRows.map((r) => ({
        funnel_id: r.funnel_id,
        step_id: r.step_id,
        views: num(r.views),
        answers: num(r.answers),
        completions: num(r.completions),
        drop_rate: num(r.drop_rate),
      })),
      stepDataHealth: {
        step_events: num(stepH.step_events),
        answered_events: num(stepH.answered_events),
      },
    },
  };
}
