CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  visitor_id TEXT,
  anonymous_id TEXT,
  lead_id TEXT,
  user_id TEXT,
  order_id TEXT,
  funnel_id TEXT,
  step_id TEXT,
  page_type TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  ttclid TEXT,
  ip TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  revenue NUMERIC(14, 2),
  currency TEXT,
  schema_name TEXT NOT NULL DEFAULT 'core_event',
  schema_version INT NOT NULL DEFAULT 1,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_name ON events (event_name);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events ("timestamp");
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events (lead_id);
CREATE INDEX IF NOT EXISTS idx_events_order_id ON events (order_id);
CREATE INDEX IF NOT EXISTS idx_events_funnel_step ON events (funnel_id, step_id);
CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events (visitor_id);
