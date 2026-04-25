import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { DevToolsProvider } from "@/components/dev-tools-provider";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const siteBase =
  process.env.VERCEL_URL != null
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title: "Protocolo Gelatina Inteligente",
  description:
    "O método simples que faz o teu corpo voltar a queimar gordura — sem dietas extremas.",
  openGraph: {
    title: "Protocolo Gelatina Inteligente",
    description:
      "O método simples que faz o teu corpo voltar a queimar gordura — sem dietas extremas.",
    type: "website",
    images: ["/brand/protocolo-gelatina-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/protocolo-gelatina-logo.png"],
  },
};

const STRIP_BIS_SKIN_SCRIPT = `(function(){function s(){try{document.querySelectorAll("[bis_skin_checked]").forEach(function(e){e.removeAttribute("bis_skin_checked");});}catch(_){}}var q=false;function r(){if(q)return;q=true;requestAnimationFrame(function(){q=false;s();});}s();if(typeof MutationObserver==="undefined")return;new MutationObserver(function(){r();}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["bis_skin_checked"]});})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${fontSans.variable} ${fontDisplay.variable} h-full font-sans antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-dvh font-sans antialiased"
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        suppressHydrationWarning
      >
        <Script
          id="strip-bis-skin"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: STRIP_BIS_SKIN_SCRIPT }}
        />
        <DevToolsProvider />
        {children}
      </body>
    </html>
  );
}
