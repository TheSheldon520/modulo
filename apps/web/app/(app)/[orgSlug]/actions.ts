// apps/web/app/(app)/[orgSlug]/actions.ts
//
// Server Actions colocated with the tenant-scoped layout. The single action
// today is `setActiveOrgCookie`, called by the `<OrgCookieResync>` client
// bridge when the URL slug points to a different org than the one currently
// persisted in the `modulo-active-org` cookie.
//
// Why a Server Action (and not "let the next tRPC call re-emit the cookie") —
// `createTRPCContext` only rewrites the cookie when no valid cookie row exists
// for the user. If the cookie already matches a *real* membership (org A) but
// the URL routes to a different org (org B, also a valid membership), tRPC
// leaves the cookie alone to avoid Set-Cookie churn on every request. That
// behaviour is correct for tRPC's single-request lifecycle but breaks the
// "URL slug is source of truth" invariant of the org-scoped shell. This
// Server Action is the explicit channel for resyncing it.

"use server";

import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@modulo/auth";
import {
  ACTIVE_ORG_COOKIE_NAME,
  getActiveOrgCookieOptions,
} from "@modulo/auth/active-org";
import { getDb } from "@modulo/db/client";
import { memberships } from "@modulo/db/schema";

/**
 * Pin the active-org cookie to `orgId`. Server Actions are publicly callable
 * by any Client Component (and any code that can reach the network endpoint
 * Next exposes for them), so we re-verify the membership server-side before
 * writing the cookie — defense in depth against a malicious or buggy client
 * passing an arbitrary `orgId`. The layout would still 404 the next render,
 * but in the window between the cookie write and the next render,
 * `createTRPCContext` reads the cookie and could pin the active org to one
 * the user is not a member of. Validating here closes that window.
 *
 * We re-emit using the exact same attributes (`HttpOnly`, `SameSite=Lax`,
 * `Max-Age=30d`, `Secure` in prod) as the Better Auth login hook and the
 * tRPC bootstrap path.
 *
 * Note: `getActiveOrgCookieOptions()` returns `sameSite: "Lax"` (capitalised,
 * because Better Auth's CookieOptions type uses that casing). Next 15's
 * `cookies().set()` wants the lowercase `"lax"` variant. We translate at the
 * boundary rather than mutating the shared helper — keeping it BA-shaped so
 * the hook in `packages/auth/src/index.ts` keeps compiling unchanged.
 */
export async function setActiveOrgCookie(orgId: string): Promise<void> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("[setActiveOrgCookie] unauthenticated");
  }

  const db = getDb();
  const rows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(memberships.organizationId, orgId),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    throw new Error("[setActiveOrgCookie] no membership for user/org pair");
  }

  const cookieStore = await cookies();
  const { sameSite: _sameSiteBA, ...rest } = getActiveOrgCookieOptions();
  void _sameSiteBA;
  cookieStore.set(ACTIVE_ORG_COOKIE_NAME, orgId, {
    ...rest,
    sameSite: "lax",
  });
}
