export type TrackingIntegrationConfig = {
  metaUrl?: string;
  metaToken?: string;
  tiktokUrl?: string;
  tiktokToken?: string;
  googleUrl?: string;
  googleToken?: string;
  utmifyUrl?: string;
  utmifyToken?: string;
};

export function getTrackingIntegrationConfig(): TrackingIntegrationConfig {
  return {
    metaUrl: process.env.TRACKING_META_WEBHOOK_URL,
    metaToken: process.env.TRACKING_META_TOKEN,
    tiktokUrl: process.env.TRACKING_TIKTOK_WEBHOOK_URL,
    tiktokToken: process.env.TRACKING_TIKTOK_TOKEN,
    googleUrl: process.env.TRACKING_GOOGLE_WEBHOOK_URL,
    googleToken: process.env.TRACKING_GOOGLE_TOKEN,
    utmifyUrl: process.env.TRACKING_UTMIFY_WEBHOOK_URL,
    utmifyToken: process.env.TRACKING_UTMIFY_TOKEN,
  };
}

export function buildIntegrationHeaders(token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
