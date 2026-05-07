"use client";

import Script from "next/script";

declare global {
  interface Window {
    pixelId?: string;
    __pgUtmifyPixelInjected?: boolean;
  }
}

/**
 * Meta Pixel (browser) + UTMify (UTMs + pixel deles).
 * CAPI é enviada a partir do servidor em `dispatchEventToIntegrations`.
 *
 * O pixel UTMify **só** é injetado depois de `latest.js` (UTMs) ter carregado;
 * carregar em paralelo costumava provocar 400 em `tracking.utmify.com.br/.../events`
 * e o `pixel.js` deles rebentava ao ler `_id` de uma resposta vazia.
 */
export function MetaUtmifyScripts() {
  const isProduction = process.env.NODE_ENV === "production";
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const utmifyPixelId = process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID?.trim();
  const disableUtmifyPixel = ["1", "true", "yes", "on"].includes(
    (process.env.NEXT_PUBLIC_UTMIFY_DISABLE_PIXEL ?? "").trim().toLowerCase(),
  );

  function injectUtmifyPixelAfterUtms() {
    if (!utmifyPixelId || disableUtmifyPixel) return;
    if (typeof window === "undefined") return;
    if (window.__pgUtmifyPixelInjected) return;
    window.__pgUtmifyPixelInjected = true;
    window.pixelId = utmifyPixelId;
    try {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://cdn.utmify.com.br/scripts/pixel/pixel.js";
      document.head.appendChild(s);
    } catch {
      /* DOM inesperado: não bloquear a app */
    }
  }

  if (!isProduction) return null;

  return (
    <>
      {metaPixelId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      <Script
        src="https://cdn.utmify.com.br/scripts/utms/latest.js"
        strategy="afterInteractive"
        data-utmify-prevent-xcod-sck
        data-utmify-prevent-subids
        onLoad={injectUtmifyPixelAfterUtms}
      />
    </>
  );
}
