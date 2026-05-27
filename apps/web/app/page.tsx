// apps/web/app/page.tsx
//
// Landing page (public) + signed-in bounce. Server Component on purpose:
//
//   - Anonymous → render the marketing copy.
//   - Signed in + active-org cookie present → resolve the slug in the DB,
//     then `redirect("/<slug>/dashboard")`. The DB hop is required because
//     the cookie carries the org **id** (stable), not the slug (renamable).
//   - Signed in + no active-org cookie → `redirect("/onboarding/create-org")`.
//     The middleware already enforces this for protected routes, but `/` is
//     OUTSIDE the matcher (so anonymous landing keeps working without a DB
//     hit) so we re-state the rule here.

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { useTranslations } from "next-intl";

import { getAuth } from "@modulo/auth";
import { ACTIVE_ORG_COOKIE_NAME } from "@modulo/auth/active-org";
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

export default async function HomePage() {
  // `getAuth()` is the lazy factory — must be called inline. Never store in a
  // top-level const (that re-introduces the eager pattern T0.10 removed).
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session) {
    return <LandingCopy />;
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value;

  if (!activeOrgId) {
    redirect("/onboarding/create-org");
  }

  // Cookie carries the org **id** (stable), not the slug (renamable). Resolve
  // the slug, scoped to the current user's memberships so a tampered or stale
  // cookie can't leak a tenant route the user has no access to. SQL filters
  // on `user_id AND organization_id` (vs loading all memberships and filtering
  // in JS) — one row max, faster, and aligns the access boundary with the DB
  // engine rather than the application layer.
  //
  // A cookie pointing at a revoked / deleted org → bounce to onboarding. We
  // don't clear the stale cookie here because `cookies().set()` is forbidden
  // in a Server Component (Next 15 constraint). The next tRPC call routed
  // through `createTRPCContext` won't clear it either when it points to an
  // org with no membership for the user (only the `rows.length === 0` branch
  // clears it). Tracked as Phase 1 cleanup: a dedicated Route Handler that
  // clears the cookie before redirecting, or migrating this redirect into
  // the middleware (which can write cookies).
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

  if (!matched) {
    redirect("/onboarding/create-org");
  }

  redirect(`/${matched.slug}/dashboard`);
}
