import type { Metadata, Viewport } from "next";
import { DataProvider } from "@/lib/data/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BTM Members Portal", template: "%s · BTM Members Portal" },
  description: "Beauty Training Mastery — Business Advisory & Support member portal.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e0e0e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" />
      </head>
      <body>
        <DataProvider>{children}</DataProvider>
      </body>
    </html>
  );
}
