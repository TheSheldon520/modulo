// apps/web/app/(app)/[orgSlug]/m/sales/deals/page.tsx
//
// Server Component — no "use client" needed. Reads the session once (via
// getAuth()) and passes `ownerId` as a prop to the Client Component
// <DealsView> so the form can pre-fill the field without a client round-trip.
// The actual data fetching (deals list) happens inside the Client Components
// (<DealsTable> / <DealsKanban>) via tRPC useQuery.
//
// Suspense boundary: <DealsView> uses `useSearchParams()` (Next.js 15 App
// Router) which requires a Suspense parent. We wrap it here so the Server
// Component page owns the boundary — if JS is slow the fallback is a plain
// loading div that mimics the page padding, not a full skeleton (the data
// skeletons are owned by <DealsKanban> and <DealsTable> themselves).

import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getAuth } from "@modulo/auth";

import { DealsView } from "./_components/deals-view";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function DealsPage({ params }: PageProps) {
  // params is a Promise in Next.js 15 App Router.
  const { orgSlug } = await params;

  // Session is already validated by the parent [orgSlug]/layout.tsx, but we
  // re-read it here to extract `session.user.id` for the ownerId prop without
  // coupling to a context or cookie — keeps this page self-contained.
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/login?next=/${orgSlug}/m/sales/deals`);
  }

  const t = await getTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/*
        Suspense boundary for useSearchParams() — Next.js 15 requires any
        Client Component calling useSearchParams() to have a Suspense ancestor.
        The fallback is intentionally minimal: the data-level skeletons are
        rendered by <DealsKanban> / <DealsTable> themselves once the shell
        hydrates.
      */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <div className="h-9 w-40 animate-pulse rounded-md bg-surface-3" />
          </div>
        }
      >
        <DealsView
          ownerId={session.user.id}
          orgSlug={orgSlug}
          title={t("title")}
          newDealLabel={t("newDeal")}
        />
      </Suspense>
    </div>
  );
}
