import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

export const metadata: Metadata = {
  title: "Modulo",
  description: "Une suite SaaS B2B modulaire — composez la vôtre.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* suppressHydrationWarning: prevent false positives from browser
          extensions injecting attributes into <body> (e.g. BitDefender,
          password managers, Notion clipper). Scoped to <body> only —
          genuine hydration mismatches elsewhere remain flagged. */}
      <body className="font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
