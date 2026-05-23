import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";

// The current `description` is already in French and matches the only locale
// shipped in T0.6.5 (`fr`). A `generateMetadata` driven by translations will
// land alongside the locale switcher in T1.X.
export const metadata: Metadata = {
  title: "Modulo",
  description: "Une suite SaaS B2B modulaire — composez la vôtre.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* suppressHydrationWarning: prevent false positives from browser
          extensions injecting attributes into <body> (e.g. BitDefender,
          password managers, Notion clipper). Scoped to <body> only —
          genuine hydration mismatches elsewhere remain flagged. */}
      <body className="font-sans" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
