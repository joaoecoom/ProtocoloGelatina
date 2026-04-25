-- Executar no Supabase SQL Editor se «db push» não tiver sido corrido
ALTER TABLE "DailyTrack" ADD COLUMN IF NOT EXISTS "moodNote" VARCHAR(500);
