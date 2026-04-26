import { NextResponse } from "next/server";

const DASHBOARD_ACCESS_COOKIE = "quizdashboard_access";
const DEFAULT_DASHBOARD_PASSWORD = "Casca2020";

function normalizePassword(value: string) {
  return value.trim().replace(/[.]+$/g, "");
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = normalizePassword(String(form.get("password") ?? ""));
  const next = String(form.get("next") ?? "/quizdashboard");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/quizdashboard";
  const configuredPassword = (process.env.QUIZDASHBOARD_PASSWORD ?? "").trim();
  const expectedPassword = normalizePassword(configuredPassword || DEFAULT_DASHBOARD_PASSWORD);

  if (password !== expectedPassword) {
    const failUrl = new URL(safeNext, request.url);
    failUrl.searchParams.set("auth", "invalid");
    return NextResponse.redirect(failUrl);
  }

  const redirectUrl = new URL(safeNext, request.url);
  redirectUrl.searchParams.delete("auth");

  const response = NextResponse.redirect(redirectUrl);
  const isHttps = new URL(request.url).protocol === "https:";
  response.cookies.set(DASHBOARD_ACCESS_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/quizdashboard",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
