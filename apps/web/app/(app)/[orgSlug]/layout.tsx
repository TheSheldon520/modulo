// apps/web/app/(app)/[orgSlug]/layout.tsx
//
// Tenant-scoped layout. Server Component on purpose — it is the security
// boundary for every page under `/[orgSlug]/...`:
//
//   1. Resolve the URL slug → org row (DB, scoped to current user's
//      memberships). A user trying `/<other-org>/dashboard` with no membership
//      gets a 404, not a redirect, because we don't want to leak whether the
//      slug exists at all.
//   2. Resolve the active modules for that org (status = 'active'). Threaded
//      to the sidebar as nav data.
//   3. Inject `org.theme` as CSS variables on a wrapper div via
//      `generateThemeVars`. Phase 1 placeholder — column ships in T1.1, the
//      editor UI lands later.
//   4. Mount `<OrgCookieResync>` so the `modulo-active-org` cookie is pinned
//      to the URL-implied org. See `actions.ts` for the rationale.
//
// `notFound()` is used (rather than `redirect("/")`) for unauthorized slugs so
// the tenant boundary doesn't leak the existence of other orgs.

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@modulo/auth";
import { ACTIVE_ORG_COOKIE_NAME } from "@modulo/auth/active-org";
import { getDb } from "@modulo/db/client";
import {
  enabledModules,
  memberships,
  organizations,
} from "@modulo/db/schema";
import { generateThemeVars } from "@modulo/ui/lib/theme-vars";

import { getModule } from "@modulo/api/modules/registry";
import { getModuleConfig } from "@/lib/module-configs";

import { OrgCookieResync } from "./_components/org-cookie-resync";
import { CommandPalette } from "./_components/command-palette/command-palette";
import { SidebarShell } from "./_components/sidebar-shell";
import type { SidebarModule } from "./_components/sidebar";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: LayoutProps) {
  const { orgSlug } = await params;

  // `getAuth()` is the lazy factory — call inline, never store at module
  // level. Mirrors the pattern in `apps/web/app/(app)/dashboard/page.tsx`.
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const db = getDb();

  // Resolve the org by slug AND membership in one shot. A row only exists if
  // the slug is real AND the current user is a member — any failure is a 404.
  const orgRows = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      theme: organizations.theme,
      role: memberships.role,
    })
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

  // Active modules for this org. The sidebar projects this list to nav rows;
  // unknown module ids (left-over rows from a removed module in the registry)
  // are filtered out via `getModule()` so we never link to a dead route.
  const activeModuleRows = await db
    .select({ moduleId: enabledModules.moduleId })
    .from(enabledModules)
    .where(
      and(
        eq(enabledModules.organizationId, org.id),
        eq(enabledModules.status, "active"),
      ),
    );

  const sidebarModules: SidebarModule[] = activeModuleRows
    .map((row) => {
      const descriptor = getModule(row.moduleId);
      if (!descriptor) return null;
      // Attach navigation items from the module config (if available).
      // Falls back to empty array for modules without a registered config.
      const config = getModuleConfig(row.moduleId);
      return {
        slug: descriptor.slug,
        name: descriptor.name,
        navigation: config ? [...config.navigation] : [],
      };
    })
    .filter((value): value is SidebarModule => value !== null);

  // All orgs the user belongs to — used by the command palette's organization
  // section so they can switch orgs via Cmd+K. One extra DB query per layout
  // render; negligible given it's already co-located with the org resolution
  // query above and runs server-side (no client round-trip).
  const allOrgRows = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, session.user.id))
    .orderBy(memberships.createdAt);

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;

  return (
    <div style={generateThemeVars(org.theme)}>
      <OrgCookieResync orgId={org.id} currentCookieOrgId={cookieOrgId} />
      {/* CommandPalette is a Dialog portal — visual position is irrelevant.
          Mounted at layout level so it persists across page navigations. */}
      <CommandPalette
        org={{ id: org.id, slug: org.slug, name: org.name }}
        orgs={allOrgRows}
        enabledModules={sidebarModules}
      />
      <SidebarShell
        orgSlug={org.slug}
        activeOrg={{ id: org.id, slug: org.slug, name: org.name }}
        modules={sidebarModules}
        userEmail={session.user.email}
        userRole={org.role}
      >
        {children}
      </SidebarShell>
    </div>
  );
}
