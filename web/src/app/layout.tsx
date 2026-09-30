import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Inventory & POS — Enterprise",
  description:
    "AI-Powered Multi-Tenant Inventory, POS & Business Management Platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#006c49",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions (Grammarly, QuillBot, dark-mode
    // tools, etc.) inject attributes like data-qb-installed onto <html>/<body>
    // before React hydrates. That is outside our control and harmless, so we let
    // React tolerate attribute diffs on this element instead of warning.
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        {/* Fonts + icon set loaded exactly as the source designs to preserve metrics. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
