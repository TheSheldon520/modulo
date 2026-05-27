// packages/api/src/trpc.ts
//
// tRPC v11 initialization + `createTRPCContext` — single source of truth for
// the request context (db client, auth session, active organization, enabled
// modules) that every procedure in the tree consumes.
//
// The context is built once per request by the route handler in `apps/web`
// and threaded through every procedure middleware. Reading it directly inside
// procedures is forbidden — always derive narrower types through the procedure
// chain (publicProcedure → authedProcedure → orgProcedure → moduleProcedure).

import { initTRPC } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";

import { getAuth, type Session } from "@modulo/auth";
import { getDb, type DbClient } from "@modulo/db/client";
import { enabledModules, memberships, organizations } from "@modulo/db/schema";

/**
 * The active organization the request is scoped to.
 * `role` is the user's role inside that organization — narrowed from the DB
 * enum so consumers don't need to re-validate it.
 */
export interface ActiveOrg {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
}

/**
 * The user identity surfaced to procedures. Mirrors Better Auth's `user`
 * shape minus fields we don't care about server-side.
 */
export interface ContextUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface Context {
  db: DbClient;
  user: ContextUser | null;
  session: Session | null;
  activeOrg: ActiveOrg | null;
  enabledModules: string[];
  /** Mutable response headers — middlewares may append `Set-Cookie` etc. */
  resHeaders: Headers;
}

/**
 * Name of the cookie holding the active organization id (uuid, not slug).
 * Id is stable; slug can be renamed by the org owner.
 *
 * Exported so other parts of the API (e.g. `organizations.create`) can
 * re-emit the cookie through `ctx.resHeaders` after mutating membership,
 * without re-declaring the cookie name or attributes in multiple places.
 */
export const ACTIVE_ORG_COOKIE = "modulo-active-org";

/** 30 days in seconds. */
const ACTIVE_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function readActiveOrgCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  // RFC 6265 cookie parsing — split on `;` then take the first `=` per pair.
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx);
    if (name !== ACTIVE_ORG_COOKIE) continue;
    const value = trimmed.slice(eqIdx + 1);
    return value.length > 0 ? decodeURIComponent(value) : null;
  }
  return null;
}

/**
 * Builds a `Set-Cookie` value for the active-org cookie. Single source of
 * truth for the cookie attributes (HttpOnly, SameSite, Secure-in-prod, Max-Age).
 * Re-emitted in two places today:
 *   - `createTRPCContext` when bootstrapping a missing cookie
 *   - `organizations.create` mutation after creating an org + membership
 */
export function buildActiveOrgCookie(orgId: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const attrs = [
    `${ACTIVE_ORG_COOKIE}=${encodeURIComponent(orgId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ACTIVE_ORG_COOKIE_MAX_AGE}`,
  ];
  if (isProd) attrs.push("Secure");
  return attrs.join("; ");
}

/**
 * Builds the per-request context. Called from the Next route handler.
 *
 * @param req         The incoming `Request` (used for headers / cookies).
 * @param resHeaders  Mutable `Headers` collector; middlewares append
 *                    `Set-Cookie` here, the route handler then merges it into
 *                    the outgoing response.
 */
export async function createTRPCContext({
  req,
  resHeaders,
}: {
  req: Request;
  resHeaders: Headers;
}): Promise<Context> {
  const db = getDb();

  // `getAuth()` is the lazy factory — calling it inline (not stored in a
  // top-level const) is the contract that keeps BA env vars deferred to
  // first request. Do not refactor this to a module-level binding.
  const session = await getAuth().api.getSession({ headers: req.headers });

  if (!session) {
    return {
      db,
      user: null,
      session: null,
      activeOrg: null,
      enabledModules: [],
      resHeaders,
    };
  }

  const user: ContextUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  // One pass: every org the user is a member of, ordered by membership age
  // (oldest first — that's our deterministic fallback when no cookie is set).
  const rows = await db
    .select({
      orgId: organizations.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, user.id))
    .orderBy(memberships.createdAt);

  if (rows.length === 0) {
    // Defense in depth: a stale `modulo-active-org` cookie may still be
    // sitting in the browser (e.g. switched user across tabs, expired BA
    // session, manual cookie tampering). Clear it so the middleware
    // fast-path stops false-positive on the next request.
    if (readActiveOrgCookie(req)) {
      resHeaders.append(
        "Set-Cookie",
        `${ACTIVE_ORG_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
    }
    return {
      db,
      user,
      session,
      activeOrg: null,
      enabledModules: [],
      resHeaders,
    };
  }

  const cookieOrgId = readActiveOrgCookie(req);
  const cookieRow = cookieOrgId
    ? rows.find((row) => row.orgId === cookieOrgId)
    : undefined;

  // Non-null assertion is safe: `rows.length > 0` was checked above and the
  // tsconfig flag `noUncheckedIndexedAccess` widens the indexed access type.
  const chosen = cookieRow ?? rows[0]!;

  // Set the cookie if it was missing or pointing at an org the user can no
  // longer access. Never overwrite when the cookie already matches an org
  // the user is a member of — that would churn `Set-Cookie` on every request.
  if (!cookieRow) {
    resHeaders.append("Set-Cookie", buildActiveOrgCookie(chosen.orgId));
  }

  const activeOrg: ActiveOrg = {
    id: chosen.orgId,
    name: chosen.orgName,
    slug: chosen.orgSlug,
    role: chosen.role,
  };

  // Module access is granted only by ACTIVE subscriptions. `past_due` rows
  // remain in the table (so the billing UI can prompt the user to fix their
  // card) but stop unlocking the corresponding module routes.
  const enabledRows = await db
    .select({ moduleId: enabledModules.moduleId })
    .from(enabledModules)
    .where(
      and(
        eq(enabledModules.organizationId, activeOrg.id),
        eq(enabledModules.status, "active"),
      ),
    );

  return {
    db,
    user,
    session,
    activeOrg,
    enabledModules: enabledRows.map((row) => row.moduleId),
    resHeaders,
  };
}

/**
 * tRPC v11 root. `superjson` is the wire transformer so `Date`, `Map`, `Set`,
 * `BigInt` etc. survive the JSON boundary; the client mirrors this setting.
 * `errorFormatter` lifts Zod issues into `error.data.zodError` so the client
 * can display per-field validation errors without re-parsing the message.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

/** Re-exported for `createCaller(ctx)` usage in tests. */
export const createCallerFactory = t.createCallerFactory;
