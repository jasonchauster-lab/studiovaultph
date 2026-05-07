import type { Metadata, Viewport } from "next";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: "#513229",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Studio Vault PH | Pilates Marketplace",
  description: "Connect with premium Pilates studios and certified instructors in the Philippines.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://studiovaultph.com"),
  openGraph: {
    title: "Studio Vault PH | Pilates Marketplace",
    description:
      "The professional marketplace connecting certified instructors with elite boutique studios in the Philippines.",
    url: "https://studiovaultph.com",
    siteName: "Studio Vault PH",
    locale: "en_PH",
    type: "website",
    images: [
      {
        url: "/images/homepage/hero_pilates_lifestyle.png",
        width: 1200,
        height: 630,
        alt: "Studio Vault PH – Pilates Studio Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Studio Vault PH | Pilates Marketplace",
    description:
      "The professional marketplace connecting certified instructors with elite boutique studios.",
    images: ["/images/homepage/hero_pilates_lifestyle.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Studio Vault",
  },
  icons: {
    icon: "/logo2.jpg",
    apple: "/apple-logo.png",
  },
};

import { ToastProvider } from "@/components/ui/Toast";
import { headers } from "next/headers";
import clsx from "clsx";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local');

  return (
    <div className={clsx(
      "antialiased",
      isStudioPortal ? "theme-cma" : "theme-marketplace"
    )}>
      {/* next/font automatically inserts preconnect hints for fonts.googleapis.com
          and fonts.gstatic.com — manual duplicates removed to avoid double hints. */}
      <link rel="preconnect" href="https://wzacmyemiljzpdskyvie.supabase.co" />
      <link rel="dns-prefetch" href="https://wzacmyemiljzpdskyvie.supabase.co" />
      <link rel="preconnect" href="https://maps.googleapis.com" />
      <link rel="preconnect" href="https://maps.gstatic.com" />
      {children}
    </div>
  );
}
