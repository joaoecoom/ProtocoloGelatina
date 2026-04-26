import { prisma } from "@/lib/prisma";

type SummaryItem = {
  key: string;
  count: number;
};

type TotalsRow = {
  totalEvents: number;
  totalSessions: number;
  entries: number;
  checkoutClicks: number;
  checkoutRedirects: number;
  checkoutErrors: number;
};

export type QuizMetricsSummary = {
  totals: {
    totalEvents: number;
    totalSessions: number;
    entries: number;
    checkoutClicks: number;
    checkoutRedirects: number;
    checkoutErrors: number;
  };
  funnelByStep: SummaryItem[];
  dropOffByStep: SummaryItem[];
  buttonClicks: SummaryItem[];
  optionClicks: SummaryItem[];
  generatedAt: string;
};

export async function getQuizMetricsSummary(): Promise<QuizMetricsSummary> {
  const [totalsRows, funnelByStep, dropOffByStep, buttonClicks, optionClicks] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>`
      select
        count(*)::int as "totalEvents",
        count(distinct "sessionId")::int as "totalSessions",
        count(*) filter (where "eventType" = 'quiz_enter')::int as "entries",
        count(*) filter (where "eventType" = 'checkout_click')::int as "checkoutClicks",
        count(*) filter (where "eventType" = 'checkout_redirect')::int as "checkoutRedirects",
        count(*) filter (where "eventType" = 'checkout_error')::int as "checkoutErrors"
      from "QuizMetricEvent"
    `,
    prisma.$queryRaw<SummaryItem[]>`
      select "stepId" as key, count(*)::int as count
      from "QuizMetricEvent"
      where "eventType" = 'step_view' and "stepId" is not null
      group by "stepId"
      order by count desc
    `,
    prisma.$queryRaw<SummaryItem[]>`
      select "stepId" as key, count(*)::int as count
      from (
        select distinct on ("sessionId") "sessionId", "stepId"
        from "QuizMetricEvent"
        where "stepId" is not null
        order by "sessionId", "createdAt" desc
      ) latest
      where "stepId" is not null
      group by "stepId"
      order by count desc
    `,
    prisma.$queryRaw<SummaryItem[]>`
      select "buttonId" as key, count(*)::int as count
      from "QuizMetricEvent"
      where "eventType" = 'button_click' and "buttonId" is not null
      group by "buttonId"
      order by count desc
    `,
    prisma.$queryRaw<SummaryItem[]>`
      select concat("questionId", ':', "optionId") as key, count(*)::int as count
      from "QuizMetricEvent"
      where "eventType" = 'option_select' and "questionId" is not null and "optionId" is not null
      group by "questionId", "optionId"
      order by count desc
      limit 50
    `,
  ]);

  const totals = totalsRows[0] ?? {
    totalEvents: 0,
    totalSessions: 0,
    entries: 0,
    checkoutClicks: 0,
    checkoutRedirects: 0,
    checkoutErrors: 0,
  };

  return {
    totals,
    funnelByStep,
    dropOffByStep,
    buttonClicks,
    optionClicks,
    generatedAt: new Date().toISOString(),
  };
}
