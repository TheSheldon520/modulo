"use client";
// "use client" justification: uses useTranslations (client-side i18n hook),
// event handler on the "import another file" button, and Link navigation.

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@modulo/ui/components/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportResult {
  dealsCreated: number;
  contactsCreated: number;
  contactsLinked: number;
}

export interface ImportReportProps {
  /** Result returned by the importBatch mutation. */
  result: ImportResult;
  /** Number of rows skipped due to validation errors (from ValidationSummary.errorCount). */
  skippedCount: number;
  /** Org slug — used to build the "View deals" link. */
  orgSlug: string;
  /** Callback invoked when the user clicks "Import another file" — resets the flow. */
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  value: number;
  label: string;
  /** When true, colours the value with text-warning (skipped rows > 0) or text-text-tertiary (= 0). */
  isSkipped?: boolean;
}

function StatCard({ value, label, isSkipped = false }: StatCardProps) {
  const valueClass = isSkipped
    ? value > 0
      ? "text-2xl font-medium text-warning"
      : "text-2xl font-medium text-text-tertiary"
    : "text-2xl font-medium text-success";

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border-subtle bg-surface-2 px-4 py-3">
      <span className={valueClass}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportReport
// ---------------------------------------------------------------------------

export function ImportReport({
  result,
  skippedCount,
  orgSlug,
  onReset,
}: ImportReportProps) {
  const t = useTranslations("modules.salesAnalytics.import");

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-6 rounded-lg border border-border-subtle bg-surface-1 p-8"
    >
      {/* Success icon + title */}
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2
          className="size-12 text-success"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="text-lg font-medium tracking-tight text-text-primary">
          {t("report.title")}
        </p>
      </div>

      {/* Stats grid — 2 cols on mobile, 4 on sm+ */}
      <div className="grid w-full max-w-lg grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          value={result.dealsCreated}
          label={t("report.stats.dealsCreatedLabel")}
        />
        <StatCard
          value={result.contactsCreated}
          label={t("report.stats.contactsCreatedLabel")}
        />
        <StatCard
          value={result.contactsLinked}
          label={t("report.stats.contactsLinkedLabel")}
        />
        <StatCard
          value={skippedCount}
          label={t("report.stats.skippedLabel")}
          isSkipped
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* "View deals" — navigates to the deals page */}
        <Button variant="default" asChild>
          <Link href={`/${orgSlug}/m/sales/deals`}>
            {t("report.viewDeals")}
          </Link>
        </Button>

        {/* "Import another file" — resets the import flow */}
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          className="focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("report.importAnother")}
        </Button>
      </div>
    </div>
  );
}
