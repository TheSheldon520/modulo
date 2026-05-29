// apps/web/app/(app)/[orgSlug]/m/sales/performance/page.tsx
//
// Performance page placeholder — to be implemented in T1.5.
// Server Component, uses the same "module in development" copy as the generic
// placeholder in /m/[moduleSlug]/page.tsx.

import { getTranslations } from "next-intl/server";

export default async function SalesPerformancePage() {
  const t = await getTranslations("app.module");

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <p className="text-sm text-text-tertiary">{t("placeholder")}</p>
    </main>
  );
}
