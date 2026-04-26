/**
 * Ajusta o Auth do projecto no Supabase (URL Configuration) via Management API.
 * Isto nao e possivel fazer com anon/service_role: precisas de um access token (conta).
 *
 * 1) Cria um token: https://supabase.com/dashboard/account/tokens
 *    Permissoes: scope que permita "project:read" e escrita de auth (auth_config_write) ou
 *    token "legacy" de organizacao, conforme a UI actual.
 * 2) No .env: SUPABASE_ACCESS_TOKEN="sbp_..." (ou a variavel usada abaixo)
 * 3) Ver diff:   npx tsx scripts/ensure-supabase-auth-urls.ts
 * 4) Aplicar:     npx tsx scripts/ensure-supabase-auth-urls.ts --write
 */
import "dotenv/config";

const MGMT = "https://api.supabase.com/v1";

function toOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const withProto =
    t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

function projectRefFromUrl(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).hostname;
    const sub = host.split(".")[0];
    return sub || null;
  } catch {
    return null;
  }
}

function parseAllowList(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function mergeAllowList(
  current: string | undefined,
  required: string[],
): { next: string; added: string[]; unchanged: boolean } {
  const seen = new Set(parseAllowList(current));
  const added: string[] = [];
  for (const u of required) {
    if (!seen.has(u)) {
      seen.add(u);
      added.push(u);
    }
  }
  const merged = [...seen];
  return {
    next: merged.join(","),
    added,
    unchanged: added.length === 0,
  };
}

function collectRedirectPaths(origins: Set<string>): string[] {
  const out: string[] = [];
  for (const o of origins) {
    if (!o) continue;
    out.push(`${o}/redefinir-password`);
  }
  return out;
}

function collectOrigins(): string[] {
  const origins = new Set<string>();
  for (const o of [
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    toOrigin(
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ),
    toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ]) {
    if (o) origins.add(o);
  }
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");
  origins.add("http://localhost:3001");
  return [...origins];
}

async function main() {
  const write = process.argv.includes("--write");
  const token =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_MANAGEMENT_API_TOKEN?.trim() ||
    "";

  const ref =
    (process.env.SUPABASE_PROJECT_REF || "").trim() ||
    projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!ref) {
    console.error(
      "Falta SUPABASE_PROJECT_REF ou NEXT_PUBLIC_SUPABASE_URL valido (https://<ref>.supabase.co).",
    );
    process.exit(1);
  }

  if (!token) {
    console.error(
      "Falta SUPABASE_ACCESS_TOKEN no .env. Cria em https://supabase.com/dashboard/account/tokens e cola no .env (nao commits).",
    );
    process.exit(1);
  }

  const origins = collectOrigins();
  const requiredPaths = collectRedirectPaths(new Set(origins));

  const getRes = await fetch(`${MGMT}/projects/${ref}/config/auth`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!getRes.ok) {
    const text = await getRes.text();
    console.error(`GET /config/auth falhou: ${getRes.status} ${getRes.statusText}\n${text.slice(0, 2000)}`);
    process.exit(1);
  }

  const config = (await getRes.json()) as {
    site_url?: string;
    uri_allow_list?: string;
  };
  const { next, added, unchanged } = mergeAllowList(
    config.uri_allow_list,
    requiredPaths,
  );

  console.log(`Project ref: ${ref}`);
  console.log(`Origins usados: ${origins.join(", ")}`);
  console.log(`Redirect paths a garantir: ${requiredPaths.length}`);
  if (unchanged) {
    console.log("uri_allow_list: ja contem todos os caminhos necessarios (nada a adicionar).");
    if (!write) return;
  } else {
    console.log("Novos entradas a acrescentar:", added.join(" | ") || "(n/a)");
  }

  if (!write) {
    console.log(
      "\nModo leitura. Correr com --write para enviar o PATCH a api.supabase.com (Management API).",
    );
    return;
  }

  const siteUrl = toOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const body: { uri_allow_list: string; site_url?: string } = {
    uri_allow_list: next,
  };
  if (siteUrl) {
    body.site_url = siteUrl;
  }

  const patchRes = await fetch(`${MGMT}/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.error(`PATCH /config/auth falhou: ${patchRes.status} ${patchRes.statusText}\n${text.slice(0, 2000)}`);
    process.exit(1);
  }

  console.log("OK. Auth config actualizado (uri_allow_list" + (siteUrl ? " + site_url" : "") + ").");
  if (siteUrl) {
    console.log(`site_url definido para: ${siteUrl}`);
  } else {
    console.log(
      "site_url nao foi alterado (define NEXT_PUBLIC_SITE_URL no .env se quiseres o PATCH a fixar o Site URL).",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
