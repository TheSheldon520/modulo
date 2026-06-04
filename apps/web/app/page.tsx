// apps/web/app/page.tsx
//
// Landing page (public) + signed-in bounce. Server Component on purpose:
//
//   - Anonymous → render the marketing copy.
//   - Signed in + active-org cookie valid → resolve the slug in the DB,
//     then `redirect("/<slug>/dashboard")`. The DB hop is required because
//     the cookie carries the org **id** (stable), not the slug (renamable).
//   - Signed in + (no cookie OR cookie points at an org the user is no
//     longer a member of) → fall back to `resolveActiveOrgForUser` (the
//     same SINGLE source of truth the BA `session.create` hook uses to
//     seed the cookie). Membership found → `/<slug>/dashboard`, the
//     `OrgCookieResync` component in `[orgSlug]/layout.tsx` re-pins the
//     cookie on the next render. Zero memberships → `/onboarding/create-org`.
//   - Signed in + zero memberships → `/onboarding/create-org`.
//
// Invariant: any valid membership → dashboard. Onboarding only when the
// user genuinely has no org. We never bounce a user with a valid org to
// onboarding just because the cookie path drifted.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { useTranslations } from "next-intl";

import { getAuth } from "@modulo/auth";
import {
  ACTIVE_ORG_COOKIE_NAME,
  resolveActiveOrgForUser,
} from "@modulo/auth/active-org";
import { getDb } from "@modulo/db/client";
import { memberships, organizations } from "@modulo/db/schema";

function LandingCopy() {
  const t = useTranslations("home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-7xl font-medium tracking-tight text-text-primary">
        {t("title")}
      </h1>
      <div className="my-7 h-px w-10 bg-border-subtle" />
      <p className="max-w-md text-lg leading-relaxed text-text-secondary">
        {t("tagline")}
      </p>
      <p className="mt-16 text-xs tracking-wide opacity-50">{t("footer")}</p>
    </main>
  );
}

/**
 * Local helper: delegate to the SHARED resolver and return the path to
 * redirect to. Centralised so both fallback branches (no cookie / stale
 * cookie) go through the exact same code path — no chance of divergence.
 *
 * Returns a path string rather than calling `redirect()` itself so callers
 * can chain `redirect(await resolveFallbackPath(...))` in tail position,
 * which TypeScript correctly recognises as a terminal `never` and uses to
 * narrow types past the call site.
 */
async function resolveFallbackPath(userId: string): Promise<string> {
  const fallback = await resolveActiveOrgForUser(getDb(), userId);
  return fallback ? `/${fallback.slug}/dashboard` : "/onboarding/create-org";
}

export default async function HomePage() {
  // `getAuth()` is the lazy factory — must be called inline. Never store in a
  // top-level const (that re-introduces the eager pattern T0.10 removed).
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session) {
    return <LandingCopy />;
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value;

  // No active-org cookie → fall back to the shared resolver. The BA
  // session-create hook seeds this cookie on every login path (email/OAuth/
  // magic-link — see packages/auth/src/index.ts), but the hook can fail
  // silently, the cookie can expire (30d), or the user can clear it.
  if (!activeOrgId) {
    redirect(await resolveFallbackPath(session.user.id));
  }

  // Cookie present → try to honor it. Scope the lookup to the user's
  // memberships so a tampered or stale cookie cannot leak a tenant route
  // the user has no access to.
  const db = getDb();
  const rows = await db
    .select({ slug: organizations.slug })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, session.user.id),
        eq(organizations.id, activeOrgId),
      ),
    )
    .limit(1);

  const matched = rows[0];
  if (matched) {
    redirect(`/${matched.slug}/dashboard`);
  }

  // Cookie points at an org the user has no membership for (revoked,
  // deleted, or tampered). Don't bounce to onboarding if the user has OTHER
  // valid memberships — fall back to the shared resolver instead. The
  // stale cookie is left as-is (Server Components cannot write cookies in
  // Next 15); `OrgCookieResync` in [orgSlug]/layout.tsx re-pins it on the
  // next render.
  redirect(await resolveFallbackPath(session.user.id));
}
