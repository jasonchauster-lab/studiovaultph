import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Lexend } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: 'swap',
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: "#513229",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Studio Vault PH | Pilates Marketplace",
  description: "Connect with premium Pilates studios and certified instructors in the Philippines.",
  manifest: "/manifest.json",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* next/font automatically inserts preconnect hints for fonts.googleapis.com
            and fonts.gstatic.com — manual duplicates removed to avoid double hints. */}
        <link rel="preconnect" href="https://wzacmyemiljzpdskyvie.supabase.co" />
        <link rel="dns-prefetch" href="https://wzacmyemiljzpdskyvie.supabase.co" />
      </head>
      <body
        className={`${playfairDisplay.variable} ${inter.variable} ${lexend.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
