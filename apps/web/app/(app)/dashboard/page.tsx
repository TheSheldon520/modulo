// apps/web/app/(app)/dashboard/page.tsx
//
// Authenticated home, Server Component. Real session validation happens here
// (`getAuth().api.getSession` reads the cookie and hits the DB). The middleware
// only provides a fast cookie-presence redirect; this is the actual security
// boundary.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getAuth } from "@modulo/auth";

import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  // `getAuth()` is the lazy factory — call inline, never store in a
  // module-level const (the latter would re-introduce the eager pattern
  // T0.10 removed).
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6">
      <h1 className="text-3xl font-medium tracking-tight text-text-primary">
        {t("greeting", { email: session.user.email })}
      </h1>
      <div className="my-6 h-px w-10 bg-border-subtle" />
      <p className="text-md text-text-secondary">{t("connected")}</p>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </main>
  );
}
