import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { DevToolsProvider } from "@/components/dev-tools-provider";
import { PwaProvider } from "@/components/pwa-provider";
import { MetaUtmifyScripts } from "@/components/tracking/meta-utmify-scripts";
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

export const viewport: Viewport = {
  themeColor: "#1b4332",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteBase),
  title: "Protocolo Gelatina Inteligente",
  description:
    "O método simples que faz o teu corpo voltar a queimar gordura — sem dietas extremas.",
  applicationName: "Protocolo Gelatina Inteligente",
  appleWebApp: {
    capable: true,
    title: "Protocolo Gelatina",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Protocolo Gelatina Inteligente",
    description:
      "O método simples que faz o teu corpo voltar a queimar gordura — sem dietas extremas.",
    type: "website",
    images: ["/brand/protocolo-gelatina-logo-v3.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/protocolo-gelatina-logo-v3.png"],
  },
};

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
        <DevToolsProvider />
        <PwaProvider />
        <MetaUtmifyScripts />
        {children}
      </body>
    </html>
  );
}
