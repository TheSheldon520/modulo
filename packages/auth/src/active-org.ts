// packages/auth/src/active-org.ts
//
// Active-organization cookie helpers for the Better Auth `databaseHooks`
// pipeline. Isolated in a sibling file so:
//
//   1. The constants / Drizzle query can be unit-tested without importing
//      `index.ts` (which carries the BA env-var contract).
//   2. The `index.ts` module stays readable — the hook itself is a few lines
//      that delegate to this module.
//
// Why a duplicate of `ACTIVE_ORG_COOKIE` / attributes from `packages/api/src/trpc.ts`?
// The tRPC layer serializes the cookie as a raw `Set-Cookie` header STRING
// (because it writes through `resHeaders.append`). The Better Auth hook
// receives a `ctx.setCookie(name, value, CookieOptions)` typed API. Sharing
// the *string* serialization between them would force one side to parse the
// other's output, or to extract a tiny serializer into a third package — both
// worse than restating the attribute VALUES (not the code) in two places.
//
// The values MUST stay in lock-step. If you change one, change the other:
//   - path: "/"
//   - httpOnly: true
//   - sameSite: "Lax"
//   - maxAge: 30 days
//   - secure: true in production only

import { desc, eq } from "drizzle-orm";

import type { DbClient } from "@modulo/db/client";
import { memberships, organizations } from "@modulo/db/schema";

/**
 * Subset of `better-call`'s `CookieOptions` we actually use. Re-declared
 * locally (rather than imported from `better-call`) so `@modulo/auth` does
 * not have to pull in a transitive dep of `better-auth` as a direct one.
 * Structural typing makes the return value still assignable to
 * `ctx.setCookie`'s third argument when the BA hook fires.
 */
interface ActiveOrgCookieOptions {
  path: string;
  httpOnly: boolean;
  sameSite: "Lax";
  maxAge: number;
  secure: boolean;
}

/**
 * Name of the cookie holding the active organization id. Must match
 * `ACTIVE_ORG_COOKIE` in `packages/api/src/trpc.ts` byte-for-byte.
 */
export const ACTIVE_ORG_COOKIE_NAME = "modulo-active-org";

/** 30 days in seconds. */
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Cookie attributes used by the Better Auth `databaseHooks.session.create.after`
 * hook when it posts the active-org cookie on the login response. Returns a
 * fresh object on every call — never mutate the result.
 *
 * Strictly mirrors `buildActiveOrgCookie` in `packages/api/src/trpc.ts`.
 */
export function getActiveOrgCookieOptions(): ActiveOrgCookieOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * Resolved active-org row carried back to callers: the stable `id` (cookie
 * payload, FK source) and the renamable `slug` (URL segment). Returning both
 * in one call avoids forcing every consumer to do a second DB hop to map the
 * id back to a slug — the only callers that exist today need either one or
 * both.
 */
export interface ResolvedActiveOrg {
  id: string;
  slug: string;
}

/**
 * Resolves the organization to attach to the active-org cookie right after
 * a session is created, AND/OR to fall back to from any `/` resolver path
 * that lost track of the active org (cookie missing, expired, manually
 * cleared, or pointing at an org the user is no longer a member of).
 *
 * Strategy: pick the user's most recently-joined membership. Rationale:
 *   - Single-org users (the vast majority post-onboarding) trivially get
 *     the only row.
 *   - Multi-org users land in the org they most recently joined / accepted —
 *     the same heuristic any "welcome back" UX would converge on.
 *   - tRPC's `createTRPCContext` uses the oldest membership as its own
 *     fallback (deterministic for the "no cookie" case). The two heuristics
 *     only ever disagree when the cookie is missing AND the user has 2+
 *     memberships — a window we close here by writing the cookie on login.
 *
 * Invariant: this is the SINGLE source of truth for the fallback. Every
 * caller (BA `session.create` hook, `/` Server Component resolver, anything
 * else) must go through this function — never re-implement the heuristic
 * inline, the two paths could silently diverge.
 *
 * Returns `null` when the user has zero memberships. Callers should bounce
 * to `/onboarding/create-org` in that case.
 */
export async function resolveActiveOrgForUser(
  db: DbClient,
  userId: string,
): Promise<ResolvedActiveOrg | null> {
  const rows = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.createdAt))
    .limit(1);

  return rows[0] ?? null;
}
