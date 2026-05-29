// apps/web/app/(app)/[orgSlug]/m/sales/layout.tsx
//
// Server Component layout that gates every page under `/m/sales/*` on the
// `sales-analytics` module being active for the current org. Without this
// guard, the more-specific routes (`/m/sales/page.tsx`, `/m/sales/deals/...`,
// `/m/sales/performance/...`, `/m/sales/settings/...`) short-circuit the
// generic `[moduleSlug]/page.tsx` placeholder and any user from an org that
// hasn't activated the module would hit a `FORBIDDEN` tRPC error rendered
// as a generic "Failed to load — please refresh" message.
//
// We re-resolve the org + the enabled-module status here directly against
// Drizzle (no cross-call to tRPC) — the parent `[orgSlug]/layout.tsx`
// already filtered `memberships` by `session.user.id`, but the security
// boundary is re-stated here so this layout stays self-contained and the
// guard remains explicit at the route level.
//
// The "not activated" copy mirrors the placeholder of
// `[moduleSlug]/page.tsx` for UX consistency. A future refactor (T1.5+ when
// a 3rd route needs this exact check) should extract a shared
// `checkModuleAccess` helper consumed from both files.

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

const MODULE_SLUG = "sales-analytics";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function SalesLayout({ children, params }: LayoutProps) {
  const { orgSlug } = await params;

  const descriptor = getModule(MODULE_SLUG);
  if (!descriptor) {
    // Should never happen — the module is statically declared in the registry.
    notFound();
  }

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const db = getDb();

  // Resolve the org + membership in a single JOIN (same pattern as the
  // generic placeholder + the parent [orgSlug]/layout.tsx).
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
        eq(enabledModules.moduleId, MODULE_SLUG),
        eq(enabledModules.status, "active"),
      ),
    )
    .limit(1);

  const isActive = activeRows.length > 0;

  if (!isActive) {
    const t = await getTranslations("app.module");
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

  return <>{children}</>;
}
