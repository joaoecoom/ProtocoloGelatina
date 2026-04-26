"use client";

import { captureAttributionFromUrl, getAttributionFields } from "../attribution";
import { getTrackingIdentity } from "../session";
import { IngestEventSchema, type IngestEvent } from "../schemas";
import { postEvent, sendEventWithBeacon } from "../transport";

type TrackInput = Omit<
  IngestEvent,
  | "event_id"
  | "event_version"
  | "timestamp"
  | "schema_name"
  | "schema_version"
  | "session_id"
  | "visitor_id"
  | "anonymous_id"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "fbclid"
  | "gclid"
  | "ttclid"
  | "referrer"
> & {
  keepalive?: boolean;
  schema_name?: string;
  schema_version?: number;
};

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `evt_${crypto.randomUUID()}`;
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function initTrackingContext() {
  captureAttributionFromUrl();
  return {
    ...getTrackingIdentity(),
    ...getAttributionFields(),
  };
}

export function getTrackingContext() {
  return {
    ...getTrackingIdentity(),
    ...getAttributionFields(),
  };
}

export async function track(input: TrackInput) {
  const { keepalive, schema_name, schema_version, ...payload } = input;
  const context = getTrackingContext();
  const event = {
    ...payload,
    event_id: createEventId(),
    event_version: 1,
    timestamp: new Date().toISOString(),
    schema_name: schema_name ?? payload.event_name,
    schema_version: schema_version ?? 1,
    session_id: context.sessionId,
    visitor_id: context.visitorId,
    anonymous_id: context.anonymousId,
    utm_source: context.utm_source,
    utm_medium: context.utm_medium,
    utm_campaign: context.utm_campaign,
    utm_content: context.utm_content,
    utm_term: context.utm_term,
    fbclid: context.fbclid,
    gclid: context.gclid,
    ttclid: context.ttclid,
    referrer: context.referrer,
    metadata_json: {
      ...(payload.metadata_json ?? {}),
      attribution: context.attribution,
    },
  };

  const parsed = IngestEventSchema.safeParse(event);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[tracking] invalid event payload", parsed.error.flatten());
    }
    return;
  }
  await postEvent(parsed.data, { keepalive });
}

export function trackWithBeacon(input: Omit<TrackInput, "keepalive">) {
  const context = getTrackingContext();
  const event = {
    ...input,
    event_id: createEventId(),
    event_version: 1,
    timestamp: new Date().toISOString(),
    schema_name: input.schema_name ?? input.event_name,
    schema_version: input.schema_version ?? 1,
    session_id: context.sessionId,
    visitor_id: context.visitorId,
    anonymous_id: context.anonymousId,
    utm_source: context.utm_source,
    utm_medium: context.utm_medium,
    utm_campaign: context.utm_campaign,
    utm_content: context.utm_content,
    utm_term: context.utm_term,
    fbclid: context.fbclid,
    gclid: context.gclid,
    ttclid: context.ttclid,
    referrer: context.referrer,
    metadata_json: {
      ...(input.metadata_json ?? {}),
      attribution: context.attribution,
    },
  };

  const parsed = IngestEventSchema.safeParse(event);
  if (!parsed.success) return false;
  return sendEventWithBeacon(parsed.data);
}
