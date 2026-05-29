// apps/web/app/(app)/[orgSlug]/m/sales/settings/page.tsx
//
// Sales settings page placeholder — to be implemented in T2+.
// adminOnly nav item, so only owners/admins reach this route. The sidebar
// already filters the link via adminOnly logic (Phase 5). This page is a
// Server Component stub.

import { getTranslations } from "next-intl/server";

export default async function SalesSettingsPage() {
  const t = await getTranslations("app.module");

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <p className="text-sm text-text-tertiary">{t("placeholder")}</p>
    </main>
  );
}
