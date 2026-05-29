// apps/web/app/(app)/[orgSlug]/m/sales/deals/page.tsx
//
// Server Component — no "use client" needed. Reads the session once (via
// getAuth()) and passes `ownerId` as a prop to the Client Component
// <NewDealDialog> so the form can pre-fill the field without a client
// round-trip. The actual data fetching (deals list) happens inside the
// Client Component <DealsTable> via tRPC useQuery.
//
// This page sits at a more specific route than the generic
// /m/[moduleSlug]/page.tsx placeholder, so Next.js will route
// /[orgSlug]/m/sales/deals here and leave /[orgSlug]/m/sales/* to the
// placeholder (T1.4 will add an overview at /m/sales).

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
      <DealsView
        ownerId={session.user.id}
        title={t("title")}
        newDealLabel={t("newDeal")}
      />
    </div>
  );
}
