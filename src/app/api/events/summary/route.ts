import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

type TotalsRow = {
  visits: number;
  sessions: number;
  leads: number;
  sales: number;
  revenue: string | number;
  conversion_rate: string | number;
};

export async function GET() {
  try {
    const [totalsRows, dailyAggRows, funnelStepRows] = await Promise.all([
      prisma.$queryRaw<TotalsRow[]>`
        SELECT
          COUNT(*) FILTER (WHERE event_name IN ('page_view', 'landing_view'))::int AS visits,
          COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::int AS sessions,
          COUNT(DISTINCT lead_id)::int AS leads,
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
      `,
      prisma.$queryRaw<DailyAggRow[]>`
        SELECT date::text, funnel_id, utm_source, events, sessions, leads, revenue
        FROM event_daily_agg
        ORDER BY date DESC
        LIMIT 90
      `,
      prisma.$queryRaw<FunnelStepRow[]>`
        SELECT funnel_id, step_id, views, answers, completions, drop_rate
        FROM funnel_step_agg
        ORDER BY funnel_id ASC, step_id ASC
      `,
    ]);

    const totals = totalsRows[0] ?? {
      visits: 0,
      sessions: 0,
      leads: 0,
      sales: 0,
      revenue: 0,
      conversion_rate: 0,
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totals: {
        visits: Number(totals.visits ?? 0),
        sessions: Number(totals.sessions ?? 0),
        leads: Number(totals.leads ?? 0),
        sales: Number(totals.sales ?? 0),
        revenue: Number(totals.revenue ?? 0),
        conversionRate: Number(totals.conversion_rate ?? 0),
      },
      dailyAgg: dailyAggRows.map((row) => ({
        date: row.date,
        funnelId: row.funnel_id,
        utmSource: row.utm_source,
        events: Number(row.events ?? 0),
        sessions: Number(row.sessions ?? 0),
        leads: Number(row.leads ?? 0),
        revenue: Number(row.revenue ?? 0),
      })),
      funnelSteps: funnelStepRows.map((row) => ({
        funnelId: row.funnel_id,
        stepId: row.step_id,
        views: Number(row.views ?? 0),
        answers: Number(row.answers ?? 0),
        completions: Number(row.completions ?? 0),
        dropRate: Number(row.drop_rate ?? 0),
      })),
    });
  } catch (error) {
    console.error("[api/events/summary]", error);
    return NextResponse.json({ error: "Failed to build tracking summary." }, { status: 500 });
  }
}
