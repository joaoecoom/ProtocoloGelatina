import Script from "next/script";

/**
 * Meta Pixel (browser) + UTMify (UTMs + pixel deles).
 * CAPI é enviada a partir do servidor em `dispatchEventToIntegrations`.
 */
export function MetaUtmifyScripts() {
  const isProduction = process.env.NODE_ENV === "production";
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const utmifyPixelId = process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID?.trim();

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
      />

      {utmifyPixelId ? (
        <Script id="utmify-pixel" strategy="afterInteractive">
          {`
window.pixelId = "${utmifyPixelId}";
var a = document.createElement("script");
a.setAttribute("async", "");
a.setAttribute("defer", "");
a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
document.head.appendChild(a);
          `}
        </Script>
      ) : null}
    </>
  );
}
