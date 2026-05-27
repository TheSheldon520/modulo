// apps/web/app/(app)/[orgSlug]/m/[moduleSlug]/page.tsx
//
// Generic module page placeholder. Server Component. The shell decides one of
// three outcomes:
//
//   1. Unknown module slug                       → 404 (notFound())
//   2. Known module + NOT active for the org     → "module not enabled" copy
//                                                  with a link to /settings/billing
//   3. Known module + active for the org         → placeholder "module in
//                                                  development" copy (real
//                                                  module routes will mount
//                                                  here from T1.2 onwards)
//
// Query the DB directly here — no cross-call to tRPC. The org boundary is
// already enforced by the parent `[orgSlug]/layout.tsx`, and the parent
// already filtered `memberships` by `session.user.id`, so we only need to
// match by `slug` again to reach the org row. We re-resolve here (rather than
// reading it from props / context) to keep the page self-contained and easy
// to move into the real module package later without rewriting the security
// boundary.

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { getAuth } from "@modulo/auth";
import { getDb } from "@modulo/db/client";
import {
  enabledModules,
  memberships,
  organizations,
} from "@modulo/db/schema";

import { getModule } from "@modulo/api/modules/registry";

import { Button } from "@modulo/ui/components/button";
import { Card } from "@modulo/ui/components/card";

interface PageProps {
  params: Promise<{ orgSlug: string; moduleSlug: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { orgSlug, moduleSlug } = await params;

  const descriptor = getModule(moduleSlug);
  if (!descriptor) {
    notFound();
  }

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const db = getDb();

  // The layout already validated this user → org. We re-resolve here as a
  // belt-and-braces check: a future refactor that moves this page into the
  // module package itself must keep the tenant boundary, and resolving
  // membership here makes that contract explicit at the route level.
  const orgRows = await db
    .select({ id: organizations.id })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(organizations.slug, orgSlug),
      ),
    )
    .limit(1);

  const org = orgRows[0];
  if (!org) {
    notFound();
  }

  const activeRows = await db
    .select({ moduleId: enabledModules.moduleId })
    .from(enabledModules)
    .where(
      and(
        eq(enabledModules.organizationId, org.id),
        eq(enabledModules.moduleId, moduleSlug),
        eq(enabledModules.status, "active"),
      ),
    )
    .limit(1);

  const isActive = activeRows.length > 0;
  const t = await getTranslations("app.module");

  if (!isActive) {
    return (
      <main className="flex min-h-full items-center justify-center px-6 py-12">
        <Card className="flex w-full max-w-md flex-col gap-4 p-8 text-center">
          <h1 className="text-xl font-medium tracking-tight text-text-primary">
            {t("inactive.title", { name: descriptor.name })}
          </h1>
          <p className="text-sm text-text-secondary">{t("inactive.body")}</p>
          <Button asChild className="mx-auto">
            <Link href="/settings/billing">{t("inactive.cta")}</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <h1 className="text-3xl font-medium tracking-tight text-text-primary">
        {descriptor.name}
      </h1>
      <div className="my-6 h-px w-10 bg-border-subtle" />
      <p className="max-w-md text-center text-md text-text-secondary">
        {descriptor.description}
      </p>
      <p className="mt-8 text-sm text-text-tertiary">{t("placeholder")}</p>
    </main>
  );
}
