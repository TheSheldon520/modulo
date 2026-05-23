// apps/web/app/(app)/dashboard/page.tsx
//
// Authenticated home, Server Component. Real session validation happens here
// (`auth.api.getSession` reads the cookie and hits the DB). The middleware
// only provides a fast cookie-presence redirect; this is the actual security
// boundary.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { auth } from "@modulo/auth";

import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

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
