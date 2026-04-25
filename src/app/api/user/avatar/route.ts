import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const BUCKET = "avatars";
const MAX_BYTES = 900 * 1024;

function isJpeg(buffer: Buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem demasiado grande (máx. ~900 KB)." }, { status: 400 });
  }
  if (file.type !== "image/jpeg") {
    return NextResponse.json({ error: "Envia um JPEG (usa o recorte no ecrã antes de confirmar)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isJpeg(buffer)) {
    return NextResponse.json({ error: "O ficheiro não é um JPEG válido." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY (Storage)." },
      { status: 503 },
    );
  }

  const path = `${user.id}/${Date.now()}.jpg`;
  let err = (await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: "image/jpeg" })).error;

  if (err && /bucket|not found|404/i.test(err.message)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    err = (await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: "image/jpeg" })).error;
  }

  if (err) {
    return NextResponse.json({ error: err.message || "Falha no Storage." }, { status: 502 });
  }

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // Supabase: Storage já guardou o ficheiro; o passo seguinte é só gravar a URL no Postgres (mesmo projeto, via Prisma).
  try {
    const row = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl },
    });
    return NextResponse.json({ avatarUrl: row.avatarUrl });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      try {
        const row = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email.trim().toLowerCase(),
            name: user.name.trim() || "Utilizador",
            avatarUrl: publicUrl,
          },
        });
        return NextResponse.json({ avatarUrl: row.avatarUrl });
      } catch (ce) {
        e = ce;
      }
    }

    const raw = e instanceof Error ? e.message : String(e);
    const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : "";
    const combined = `${raw} ${code}`;

    console.error("[api/user/avatar] postgres:", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2022") {
      return NextResponse.json(
        {
          error:
            "A coluna «avatarUrl» não existe no Postgres. Corre «npx prisma db push» ou o script «scripts/add-avatar-url-column.sql» no Supabase SQL.",
        },
        { status: 503 },
      );
    }

    if (
      /max.?client|too many connections|p1008|p1001|can't reach database|closed the connection|econnrefused|timed out/i.test(
        combined,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "O Postgres (Supabase) recusou a ligação: pool cheio ou timeout. Espera 1 minuto, fecha Prisma Studio/outros «dev», confirma DATABASE_URL (porta 6543 + pgbouncer) e DIRECT_URL (host db.….supabase.co) no .env — vê .env.example.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          "A foto foi enviada ao Storage do Supabase, mas falhou gravar a URL na tabela «User» (Postgres / Prisma).",
        ...(process.env.NODE_ENV === "development" ? { details: raw.slice(0, 2000) } : {}),
      },
      { status: 503 },
    );
  }
}
