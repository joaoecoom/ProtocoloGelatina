import type { IngestEvent } from "@/lib/tracking/schemas";
import { buildIntegrationHeaders, getTrackingIntegrationConfig } from "./config";

type Platform = "meta" | "tiktok" | "google" | "utmify";

const META_EVENT_MAP: Partial<Record<IngestEvent["event_name"], string>> = {
  page_view: "PageView",
  landing_view: "ViewContent",
  result_viewed: "ViewContent",
  quiz_completed: "Lead",
  checkout_started: "InitiateCheckout",
  payment_success: "Purchase",
};

const TIKTOK_EVENT_MAP: Partial<Record<IngestEvent["event_name"], string>> = {
  page_view: "ViewContent",
  landing_view: "ViewContent",
  checkout_started: "InitiateCheckout",
  payment_success: "CompletePayment",
};

const GOOGLE_EVENT_MAP: Partial<Record<IngestEvent["event_name"], string>> = {
  page_view: "page_view",
  checkout_started: "conversion",
  payment_success: "purchase",
};

function mapPlatformEvent(platform: Platform, eventName: IngestEvent["event_name"]) {
  if (platform === "meta") return META_EVENT_MAP[eventName];
  if (platform === "tiktok") return TIKTOK_EVENT_MAP[eventName];
  if (platform === "google") return GOOGLE_EVENT_MAP[eventName];
  return eventName;
}

function buildPayload(platform: Platform, event: IngestEvent) {
  const mapped = mapPlatformEvent(platform, event.event_name);
  if (!mapped) return null;
  return {
    platform,
    mapped_event_name: mapped,
    source_event_name: event.event_name,
    event_id: event.event_id,
    timestamp: event.timestamp,
    session_id: event.session_id,
    visitor_id: event.visitor_id,
    anonymous_id: event.anonymous_id,
    lead_id: event.lead_id,
    user_id: event.user_id,
    order_id: event.order_id,
    funnel_id: event.funnel_id,
    step_id: event.step_id,
    utm_source: event.utm_source,
    utm_medium: event.utm_medium,
    utm_campaign: event.utm_campaign,
    utm_content: event.utm_content,
    utm_term: event.utm_term,
    fbclid: event.fbclid,
    gclid: event.gclid,
    ttclid: event.ttclid,
    revenue: event.revenue,
    currency: event.currency,
    metadata_json: event.metadata_json,
  };
}

async function sendToWebhook(url: string, token: string | undefined, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: buildIntegrationHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`dispatch failed status=${response.status}`);
  }
}

export async function dispatchEventToIntegrations(event: IngestEvent) {
  const cfg = getTrackingIntegrationConfig();

  const jobs: Promise<void>[] = [];

  // UTMify receives every event.
  if (cfg.utmifyUrl) {
    const body = buildPayload("utmify", event);
    if (body) jobs.push(sendToWebhook(cfg.utmifyUrl, cfg.utmifyToken, body));
  }

  if (cfg.metaUrl) {
    const body = buildPayload("meta", event);
    if (body) jobs.push(sendToWebhook(cfg.metaUrl, cfg.metaToken, body));
  }

  if (cfg.tiktokUrl) {
    const body = buildPayload("tiktok", event);
    if (body) jobs.push(sendToWebhook(cfg.tiktokUrl, cfg.tiktokToken, body));
  }

  if (cfg.googleUrl) {
    const body = buildPayload("google", event);
    if (body) jobs.push(sendToWebhook(cfg.googleUrl, cfg.googleToken, body));
  }

  if (jobs.length === 0) return;
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn("[tracking][dispatch] failures", failed.length);
  }
}
