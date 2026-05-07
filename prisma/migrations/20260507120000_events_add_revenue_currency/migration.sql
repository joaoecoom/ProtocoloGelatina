-- Bases criadas antes da coluna existir ou sem aplicar a migração inicial completa.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS revenue NUMERIC(14, 2);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS currency TEXT;
