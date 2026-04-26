import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { dispatchEventToIntegrations } from "@/lib/tracking/integrations";
import { IngestEventSchema, IngestEventsBatchSchema } from "@/lib/tracking/schemas";
import { prisma } from "@/lib/prisma";

function parseBrowserContext(ua: string | null) {
  const userAgent = ua ?? "";
  return {
    device: /Mobile|Android|iPhone|iPad/i.test(userAgent) ? "mobile" : "desktop",
    browser: /Chrome/i.test(userAgent)
      ? "chrome"
      : /Safari/i.test(userAgent)
        ? "safari"
        : /Firefox/i.test(userAgent)
          ? "firefox"
          : /Edg/i.test(userAgent)
            ? "edge"
            : undefined,
    os: /Windows/i.test(userAgent)
      ? "windows"
      : /Mac OS|Macintosh/i.test(userAgent)
        ? "macos"
        : /Android/i.test(userAgent)
          ? "android"
          : /iPhone|iPad|iOS/i.test(userAgent)
            ? "ios"
            : undefined,
  };
}

function isSchemaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const asBatch = IngestEventsBatchSchema.safeParse(json);
  const asSingle = IngestEventSchema.safeParse(json);
  if (!asBatch.success && !asSingle.success) {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }

  const events = asBatch.success ? asBatch.data.events : [asSingle.data];
  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent");
  const referrer = hdrs.get("referer");
  const forwardedFor = hdrs.get("x-forwarded-for");
  const country = hdrs.get("x-vercel-ip-country") ?? hdrs.get("cf-ipcountry");
  const ip = forwardedFor?.split(",")[0]?.trim();
  const tech = parseBrowserContext(userAgent);

  try {
    const rows = events.map((event) => ({
      eventId: event.event_id,
      eventName: event.event_name,
      eventVersion: event.event_version,
      timestamp: new Date(event.timestamp),
      sessionId: event.session_id ?? null,
      visitorId: event.visitor_id ?? null,
      anonymousId: event.anonymous_id ?? null,
      leadId: event.lead_id ?? null,
      userId: event.user_id ?? null,
      orderId: event.order_id ?? null,
      funnelId: event.funnel_id ?? null,
      stepId: event.step_id ?? null,
      pageType: event.page_type ?? null,
      utmSource: event.utm_source ?? null,
      utmMedium: event.utm_medium ?? null,
      utmCampaign: event.utm_campaign ?? null,
      utmContent: event.utm_content ?? null,
      utmTerm: event.utm_term ?? null,
      fbclid: event.fbclid ?? null,
      gclid: event.gclid ?? null,
      ttclid: event.ttclid ?? null,
      ip: event.ip ?? ip ?? null,
      country: event.country ?? country ?? null,
      device: event.device ?? tech.device ?? null,
      browser: event.browser ?? tech.browser ?? null,
      os: event.os ?? tech.os ?? null,
      referrer: event.referrer ?? referrer ?? null,
      revenue: event.revenue ?? null,
      currency: event.currency ?? null,
      schemaName: event.schema_name,
      schemaVersion: event.schema_version,
      metadataJson: event.metadata_json ?? {},
    }));

    const result = await prisma.event.createMany({
      data: rows,
      skipDuplicates: true,
    });

    // Fire-and-forget style (awaited safely) external dispatch hooks.
    await Promise.allSettled(events.map((event) => dispatchEventToIntegrations(event)));

    return NextResponse.json({ ok: true, received: rows.length, inserted: result.count });
  } catch (error) {
    if (isSchemaError(error)) {
      return NextResponse.json(
        { error: "Events table missing in database. Run migrations or prisma db push.", code: "DB_SCHEMA" },
        { status: 503 },
      );
    }
    console.error("[api/events/ingest]", error);
    return NextResponse.json({ error: "Failed to ingest events." }, { status: 500 });
  }
}
