-- Janela do dia (lembretes) — se «db push» ainda não correu
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markManha" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markAlmoco" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markLanche" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "markJanta" BOOLEAN NOT NULL DEFAULT false;
