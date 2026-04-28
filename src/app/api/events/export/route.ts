import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";
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

const RANGE_TO_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

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

function csvEscape(value: string | number | boolean | null | undefined) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";
  const month = url.searchParams.get("month");
  const funnelFilter = url.searchParams.get("funnel") ?? "all";
  const sourceFilter = url.searchParams.get("source") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim();
  const colParams = url.searchParams.getAll("col");
  const selectedColumns =
    colParams.length > 0
      ? QUIZ_STEP_COLUMNS.filter((c) => colParams.includes(c))
      : [...QUIZ_STEP_COLUMNS];

  const whereParts: Prisma.Sql[] = [];
  if (range === "month" && month && /^\d{4}-\d{2}$/.test(month)) {
    whereParts.push(
      Prisma.sql`"timestamp" >= to_date(${`${month}-01`}, 'YYYY-MM-DD')
                 AND "timestamp" < (to_date(${`${month}-01`}, 'YYYY-MM-DD') + INTERVAL '1 month')`,
    );
  } else {
    const days = RANGE_TO_DAYS[range];
    if (days) whereParts.push(Prisma.sql`"timestamp" >= NOW() - (${days} * INTERVAL '1 day')`);
  }
  if (funnelFilter !== "all") whereParts.push(Prisma.sql`COALESCE(funnel_id, 'unknown') = ${funnelFilter}`);
  if (sourceFilter !== "all") whereParts.push(Prisma.sql`COALESCE(utm_source, 'direct') = ${sourceFilter}`);
  if (q.length > 0) whereParts.push(Prisma.sql`COALESCE(lead_id, session_id, anonymous_id, visitor_id) ILIKE ${`%${q}%`}`);
  const whereSql = whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw<LeadFunnelRow[]>(Prisma.sql`
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
    LIMIT 5000
  `);

  const header = [
    "lead",
    "date",
    "quiz_started",
    "result_cta_clicked",
    "checkout_started",
    "payment_success",
    ...selectedColumns,
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    const steps = row.step_answers ?? {};
    const values = [
      row.lead_display,
      new Date(row.first_seen).toISOString(),
      row.quiz_started,
      row.result_cta_clicked,
      row.checkout_started,
      row.payment_success,
      ...selectedColumns.map((c) => steps[c] ?? ""),
    ];
    lines.push(values.map(csvEscape).join(","));
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quiz-funnel-leads.csv"`,
    },
  });
}
