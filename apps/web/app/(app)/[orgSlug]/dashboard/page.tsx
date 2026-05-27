// apps/web/app/(app)/[orgSlug]/dashboard/page.tsx
//
// Authenticated home, Server Component. The tenant boundary (slug → org →
// membership) is enforced by the parent layout (`[orgSlug]/layout.tsx`), so
// this page can trust it runs inside a valid org context. We still call
// `getAuth().api.getSession` because the dashboard wants the user identity
// for the greeting — the redirect here is a defense-in-depth no-op.
//
// Moved from `apps/web/app/(app)/dashboard/page.tsx` as part of T1.1.

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
    <main className="flex min-h-full flex-col items-center justify-center bg-surface-0 px-6 py-12">
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
