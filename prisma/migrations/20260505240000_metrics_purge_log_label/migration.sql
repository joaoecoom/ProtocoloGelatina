-- Nome opcional por reset (histórico identificável)
ALTER TABLE "metrics_purge_logs" ADD COLUMN IF NOT EXISTS "label" VARCHAR(200);
