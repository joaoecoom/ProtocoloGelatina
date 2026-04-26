CREATE OR REPLACE VIEW event_daily_agg AS
SELECT
  DATE("timestamp") AS date,
  COALESCE(funnel_id, 'unknown') AS funnel_id,
  COALESCE(utm_source, 'direct') AS utm_source,
  COUNT(*)::int AS events,
  COUNT(DISTINCT COALESCE(session_id, anonymous_id, visitor_id))::int AS sessions,
  COUNT(DISTINCT lead_id)::int AS leads,
  COALESCE(SUM(revenue), 0)::numeric(14,2) AS revenue
FROM events
GROUP BY DATE("timestamp"), COALESCE(funnel_id, 'unknown'), COALESCE(utm_source, 'direct');

CREATE OR REPLACE VIEW funnel_step_agg AS
WITH base AS (
  SELECT
    COALESCE(funnel_id, 'unknown') AS funnel_id,
    step_id,
    event_name,
    "timestamp"
  FROM events
  WHERE step_id IS NOT NULL
)
SELECT
  funnel_id,
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
FROM base
GROUP BY funnel_id, step_id;
