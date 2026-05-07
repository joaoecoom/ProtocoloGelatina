import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

const ADMIN_EMAIL = "geral.joaoecoom@gmail.com";
const DASHBOARD_ACCESS_COOKIE = "quizdashboard_access";

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

async function requireAccess() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.email.toLowerCase() !== ADMIN_EMAIL && !user.isSuperAdmin) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const cookieStore = await cookies();
  if (cookieStore.get(DASHBOARD_ACCESS_COOKIE)?.value !== "ok") {
    return NextResponse.json({ error: "Password do dashboard necessária." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const deny = await requireAccess();
  if (deny) return deny;

  const nextPublicMetaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const metaCapiAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const nextPublicUtmifyPixelId = process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID;
  const nextPublicUtmifyDisablePixel = process.env.NEXT_PUBLIC_UTMIFY_DISABLE_PIXEL;
  const trackingUtmifyWebhookUrl = process.env.TRACKING_UTMIFY_WEBHOOK_URL;
  const trackingUtmifyToken = process.env.TRACKING_UTMIFY_TOKEN;

  return NextResponse.json({
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      vercelEnv: process.env.VERCEL_ENV ?? "unknown",
    },
    meta: {
      browserPixelEnabled: hasValue(nextPublicMetaPixelId),
      capiEnabled: hasValue(metaCapiAccessToken),
      pixelIdPrefix: nextPublicMetaPixelId?.slice(0, 6) ?? null,
    },
    utmify: {
      browserPixelEnabled: hasValue(nextPublicUtmifyPixelId),
      browserPixelInjectDisabled: ["1", "true", "yes", "on"].includes(
        (nextPublicUtmifyDisablePixel ?? "").trim().toLowerCase(),
      ),
      webhookEnabled: hasValue(trackingUtmifyWebhookUrl),
      webhookTokenEnabled: hasValue(trackingUtmifyToken),
      pixelIdPrefix: nextPublicUtmifyPixelId?.slice(0, 6) ?? null,
      webhookHost: trackingUtmifyWebhookUrl
        ? (() => {
            try {
              return new URL(trackingUtmifyWebhookUrl).host;
            } catch {
              return "invalid_url";
            }
          })()
        : null,
    },
  });
}
