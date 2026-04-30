import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureVapid() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@localhost";
  if (!publicKey || !privateKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são obrigatórios para enviar push.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

export async function sendWebPushToEndpoint(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  ensureVapid();
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag ?? "pg",
    url: payload.url ?? "/dashboard",
  });
  try {
    await webpush.sendNotification(subscription, body, { TTL: 86_400 });
    return true;
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
    }
    console.error("[web-push]", sub.endpoint.slice(0, 48), e);
    return false;
  }
}
