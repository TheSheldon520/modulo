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


import { OrgCookieResync } from "./_components/org-cookie-resync";
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
      return { slug: descriptor.slug, name: descriptor.name };
    })
    .filter((value): value is SidebarModule => value !== null);

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value ?? null;

  return (
    <div style={generateThemeVars(org.theme)}>
      <OrgCookieResync orgId={org.id} currentCookieOrgId={cookieOrgId} />
      <SidebarShell
        orgSlug={org.slug}
        activeOrg={{ id: org.id, slug: org.slug, name: org.name }}
        modules={sidebarModules}
        userEmail={session.user.email}
      >
        {children}
      </SidebarShell>
    </div>
  );
}
