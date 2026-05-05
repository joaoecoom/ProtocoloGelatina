-- Metrics purge audit trail (snapshot before deleting events)
CREATE TABLE IF NOT EXISTS "metrics_purge_logs" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_user_id" UUID NOT NULL,
  "created_by_email" TEXT NOT NULL,
  "scope" VARCHAR(32) NOT NULL,
  "events_removed" INTEGER NOT NULL,
  "summary_before" JSONB NOT NULL,

  CONSTRAINT "metrics_purge_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "metrics_purge_logs_created_at_idx" ON "metrics_purge_logs"("created_at" DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'metrics_purge_logs_created_by_user_id_fkey'
    ) THEN
      ALTER TABLE "metrics_purge_logs"
        ADD CONSTRAINT "metrics_purge_logs_created_by_user_id_fkey"
        FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
