// apps/web/app/(app)/[orgSlug]/m/sales/import/page.tsx
//
// Server Component — no "use client" needed.
//
// Reads the session (the parent sales/layout.tsx has already validated the org
// and the module activation — this re-read is only for the redirect safety net
// and is consistent with the pattern established in deals/page.tsx).
//
// All interactive behaviour (file drop, parsing, preview) is delegated to the
// Client Component <ImportView>, wrapped in a Suspense boundary owned here so
// the page stays a pure Server Component.
//
// Phase 1 scope: no tRPC prefetch needed — parsing is 100% client-side.

import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getAuth } from "@modulo/auth";

import { ImportView } from "./_components/import-view";
import { ImportViewSkeleton } from "./_components/import-view-skeleton";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function ImportPage({ params }: PageProps) {
  const { orgSlug } = await params;

  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/login?next=/${orgSlug}/m/sales/import`);
  }

  const t = await getTranslations("modules.salesAnalytics.import");

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight text-text-primary">
          {t("title")}
        </h1>
        <p className="text-sm text-text-secondary">{t("description")}</p>
      </header>

      {/*
        Suspense boundary: ImportView uses useState and dynamic imports which
        are inherently client-only. The fallback skeleton mimics the dropzone
        layout so the page doesn't flash blank while JS hydrates.
      */}
      <Suspense fallback={<ImportViewSkeleton />}>
        <ImportView orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
