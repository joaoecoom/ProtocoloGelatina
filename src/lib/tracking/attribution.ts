"use client";

const ATTRIBUTION_KEY = "pg_tracking_attribution";

type Touchpoint = {
  timestamp: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  referrer?: string;
};

type AttributionState = {
  first_touch?: Touchpoint;
  last_touch?: Touchpoint;
  touchpoints: Touchpoint[];
};

function canUseBrowser() {
  return typeof window !== "undefined";
}

function parseCurrentTouchpoint(): Touchpoint | null {
  if (!canUseBrowser()) return null;
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const touchpoint: Touchpoint = {
    timestamp: new Date().toISOString(),
    utm_source: p.get("utm_source") ?? undefined,
    utm_medium: p.get("utm_medium") ?? undefined,
    utm_campaign: p.get("utm_campaign") ?? undefined,
    utm_content: p.get("utm_content") ?? undefined,
    utm_term: p.get("utm_term") ?? undefined,
    fbclid: p.get("fbclid") ?? undefined,
    gclid: p.get("gclid") ?? undefined,
    ttclid: p.get("ttclid") ?? undefined,
    referrer: document.referrer || undefined,
  };
  const hasAttribution = Object.entries(touchpoint).some(
    ([k, v]) => k !== "timestamp" && k !== "referrer" && Boolean(v),
  );
  return hasAttribution ? touchpoint : null;
}

function readState(): AttributionState {
  if (!canUseBrowser()) return { touchpoints: [] };
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return { touchpoints: [] };
    const parsed = JSON.parse(raw) as AttributionState;
    return {
      ...parsed,
      touchpoints: Array.isArray(parsed.touchpoints) ? parsed.touchpoints : [],
    };
  } catch {
    return { touchpoints: [] };
  }
}

function writeState(state: AttributionState) {
  if (!canUseBrowser()) return;
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(state));
}

export function captureAttributionFromUrl() {
  if (!canUseBrowser()) return;
  const nextTouchpoint = parseCurrentTouchpoint();
  if (!nextTouchpoint) return;

  const state = readState();
  const next: AttributionState = {
    first_touch: state.first_touch ?? nextTouchpoint,
    last_touch: nextTouchpoint,
    touchpoints: [...state.touchpoints, nextTouchpoint].slice(-50),
  };
  writeState(next);
}

export function getAttributionState(): AttributionState {
  return readState();
}

export function getAttributionFields() {
  const state = readState();
  const source = state.last_touch ?? state.first_touch;
  return {
    utm_source: source?.utm_source,
    utm_medium: source?.utm_medium,
    utm_campaign: source?.utm_campaign,
    utm_content: source?.utm_content,
    utm_term: source?.utm_term,
    fbclid: source?.fbclid,
    gclid: source?.gclid,
    ttclid: source?.ttclid,
    referrer: source?.referrer,
    attribution: state,
  };
}
