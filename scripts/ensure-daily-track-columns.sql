-- Aplicar no SQL Editor do mesmo Postgres que a app usa (ex.: Supabase), se POST /api/tracking falhar.
-- Equivale a correr add-mood-note-column.sql + add-day-mark-columns.sql.

ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "moodNote" VARCHAR(500);
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markManha" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markAlmoco" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markLanche" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markJanta" BOOLEAN NOT NULL DEFAULT false;
