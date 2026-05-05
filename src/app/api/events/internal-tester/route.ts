import { NextRequest, NextResponse } from "next/server";

const INTERNAL_TEST_COOKIE = "pg_internal_tester";

function isAllowed(request: NextRequest) {
  const configuredKey = process.env.TRACKING_INTERNAL_TEST_TOGGLE_KEY?.trim();
  if (!configuredKey) return true;
  const provided = request.nextUrl.searchParams.get("key")?.trim();
  return provided === configuredKey;
}

function buildRedirectPath(request: NextRequest) {
  const candidate = request.nextUrl.searchParams.get("redirect")?.trim() || "/quiz";
  if (!candidate.startsWith("/")) return "/quiz";
  if (candidate.startsWith("//")) return "/quiz";
  return candidate;
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const enabled = request.nextUrl.searchParams.get("enabled") !== "0";
  const redirectPath = buildRedirectPath(request);
  const wantsJson = request.nextUrl.searchParams.get("format") === "json";

  const response = wantsJson
    ? NextResponse.json({ ok: true, internalTester: enabled })
    : NextResponse.redirect(new URL(redirectPath, request.url));

  if (enabled) {
    response.cookies.set(INTERNAL_TEST_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  } else {
    response.cookies.delete(INTERNAL_TEST_COOKIE);
  }

  return response;
}
