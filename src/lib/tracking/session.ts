"use client";

const VISITOR_ID_KEY = "pg_tracking_visitor_id";
const ANON_ID_KEY = "pg_tracking_anonymous_id";
const SESSION_ID_KEY = "pg_tracking_session_id";
const SESSION_LAST_SEEN_KEY = "pg_tracking_session_last_seen";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function canUseBrowser() {
  return typeof window !== "undefined";
}

function readCookie(name: string): string | null {
  if (!canUseBrowser()) return null;
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) return null;
  const value = cookie.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  if (!canUseBrowser()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function ensurePersistentId(storageKey: string, cookieKey: string, prefix: string) {
  if (!canUseBrowser()) return "";
  const fromStorage = window.localStorage.getItem(storageKey);
  if (fromStorage) {
    writeCookie(cookieKey, fromStorage);
    return fromStorage;
  }
  const fromCookie = readCookie(cookieKey);
  if (fromCookie) {
    window.localStorage.setItem(storageKey, fromCookie);
    return fromCookie;
  }
  const id = createId(prefix);
  window.localStorage.setItem(storageKey, id);
  writeCookie(cookieKey, id);
  return id;
}

export function getOrCreateVisitorId() {
  return ensurePersistentId(VISITOR_ID_KEY, VISITOR_ID_KEY, "vis");
}

export function getOrCreateAnonymousId() {
  // Keep anonymous_id equivalent to visitor_id by design.
  const visitorId = getOrCreateVisitorId();
  if (!canUseBrowser()) return visitorId;
  window.localStorage.setItem(ANON_ID_KEY, visitorId);
  writeCookie(ANON_ID_KEY, visitorId);
  return visitorId;
}

export function getOrCreateSessionId() {
  if (!canUseBrowser()) return "";
  const now = Date.now();
  const current = window.sessionStorage.getItem(SESSION_ID_KEY) ?? readCookie(SESSION_ID_KEY);
  const lastSeenRaw = window.sessionStorage.getItem(SESSION_LAST_SEEN_KEY) ?? readCookie(SESSION_LAST_SEEN_KEY);
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
  const isExpired = !current || !lastSeen || now - lastSeen > SESSION_TIMEOUT_MS;

  const sessionId = isExpired ? createId("sess") : current;
  window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(now));
  writeCookie(SESSION_ID_KEY, sessionId, 60 * 60 * 24);
  writeCookie(SESSION_LAST_SEEN_KEY, String(now), 60 * 60 * 24);
  return sessionId;
}

export function touchSession() {
  if (!canUseBrowser()) return;
  const now = Date.now();
  window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(now));
  writeCookie(SESSION_LAST_SEEN_KEY, String(now), 60 * 60 * 24);
}

export function getTrackingIdentity() {
  const visitorId = getOrCreateVisitorId();
  const anonymousId = getOrCreateAnonymousId();
  const sessionId = getOrCreateSessionId();
  touchSession();
  return { sessionId, visitorId, anonymousId };
}
