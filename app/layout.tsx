import { Inter, Playfair_Display, Lexend } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { OnboardingProvider } from "@/lib/contexts/OnboardingContext";
import clsx from "clsx";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: 'swap',
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: "StudioVault",
  description: "All-in-one studio management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={clsx(
          inter.variable,
          playfair.variable,
          lexend.variable,
          "antialiased"
        )}
        suppressHydrationWarning
      >
        <ToastProvider>
          <OnboardingProvider>
            {children}
          </OnboardingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
