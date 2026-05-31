"use client";
// "use client" justification: displays an animated Loader2 spinner (CSS
// animation requires DOM) and uses useTranslations (client-side i18n hook).

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportImportingProps {
  /** Number of valid rows being imported — shown in the subtitle. */
  rowCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportImporting({ rowCount }: ImportImportingProps) {
  const t = useTranslations("modules.salesAnalytics.import");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 p-12 text-center"
    >
      {/* Spinner */}
      <Loader2
        className="size-8 animate-spin text-accent"
        strokeWidth={1.5}
        aria-hidden
      />

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-text-primary">
          {t("importing.title")}
        </p>

        {/* Subtitle — ICU plural */}
        <p className="text-sm text-text-secondary">
          {t("importing.subtitle", { count: rowCount })}
        </p>
      </div>

      {/* Do not close hint */}
      <p className="text-xs text-text-tertiary">{t("importing.dontClose")}</p>
    </div>
  );
}
