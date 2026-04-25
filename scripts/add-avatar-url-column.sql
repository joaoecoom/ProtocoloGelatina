-- Correr no Supabase: SQL Editor → New query → Run
-- Útil quando «npx prisma db push» falha por limite de ligações no pooler.
-- Tabela Prisma «User» em Postgres fica com o nome "User" (com maiúscula).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Se a coluna já existia como VARCHAR curto e o guardar da foto falhar, força TEXT:
ALTER TABLE "User" ALTER COLUMN "avatarUrl" TYPE TEXT;
