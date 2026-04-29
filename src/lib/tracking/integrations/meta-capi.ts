import { createHash } from "node:crypto";
import type { IngestEvent } from "@/lib/tracking/schemas";

const META_GRAPH_VERSION = "v21.0";

const META_EVENT_MAP: Partial<Record<IngestEvent["event_name"], string>> = {
  page_view: "PageView",
  landing_view: "ViewContent",
  result_viewed: "ViewContent",
  quiz_completed: "Lead",
  checkout_started: "InitiateCheckout",
  payment_success: "Purchase",
};

function sha256HexLower(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

function buildFbcFromFbclid(fbclid: string): string {
  const t = Date.now();
  return `fb.1.${t}.${fbclid}`;
}

function getMetaCapiConfig() {
  const pixelId = process.env.META_PIXEL_ID?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken, testEventCode: testEventCode || undefined };
}

/**
 * Envia evento à Meta Conversions API (CAPI).
 * Deduplicação com o Pixel: usa o mesmo `event_id` que o cliente envia em `/api/events/ingest`.
 */
export async function sendMetaConversionsApiEvent(event: IngestEvent): Promise<void> {
  const cfg = getMetaCapiConfig();
  if (!cfg) return;

  // Evita PageView duplicado quando o Pixel browser também dispara PageView.
  if (event.event_name === "page_view" && process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()) {
    return;
  }

  const eventName = META_EVENT_MAP[event.event_name];
  if (!eventName) return;

  const meta: Record<string, unknown> =
    event.metadata_json && typeof event.metadata_json === "object"
      ? (event.metadata_json as Record<string, unknown>)
      : {};

  const emailRaw =
    (typeof meta.access_email === "string" && meta.access_email) ||
    (typeof meta.email === "string" && meta.email) ||
    "";

  const eventTime = Math.floor(new Date(event.timestamp).getTime() / 1000);

  const userData: Record<string, unknown> = {};
  if (emailRaw && emailRaw.includes("@")) {
    userData.em = [sha256HexLower(emailRaw)];
  }
  if (event.visitor_id) {
    userData.external_id = [sha256HexLower(event.visitor_id)];
  }
  if (event.ip) {
    userData.client_ip_address = event.ip;
  }
  if (event.fbclid) {
    userData.fbc = buildFbcFromFbclid(event.fbclid);
  }

  const customData: Record<string, unknown> = {};
  if (typeof event.revenue === "number" && event.revenue > 0) {
    customData.value = event.revenue;
    customData.currency = (event.currency ?? "EUR").toLowerCase();
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: event.event_id,
        event_source_url: typeof meta.event_source_url === "string" ? meta.event_source_url : undefined,
        action_source: "website",
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
  };

  if (cfg.testEventCode) {
    body.test_event_code = cfg.testEventCode;
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta CAPI failed ${res.status}: ${text.slice(0, 300)}`);
  }
}
