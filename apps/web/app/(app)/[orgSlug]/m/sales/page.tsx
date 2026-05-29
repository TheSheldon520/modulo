// apps/web/app/(app)/[orgSlug]/m/sales/page.tsx
//
// Sales Analytics overview page. Server Component on purpose — params is
// resolved here and passed down to the Client Component that owns the period
// state and tRPC query. No server-side data fetching happens here: the
// overview data is loaded by SalesOverviewView via tRPC useQuery so period
// changes don't require server round-trips.
//
// Route: /[orgSlug]/m/sales
// This specific page takes precedence over the generic /m/[moduleSlug]/page.tsx
// because Next.js resolves static segments before dynamic ones.

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

import { SalesOverviewView } from "./_components/sales-overview-view";

export default async function SalesOverviewPage({ params }: PageProps) {
  const { orgSlug } = await params;

  return <SalesOverviewView orgSlug={orgSlug} />;
}
