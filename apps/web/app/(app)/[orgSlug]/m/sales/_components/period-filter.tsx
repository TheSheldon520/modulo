"use client";
// "use client" justification: interactive toggle buttons with onChange handler.

import { useTranslations } from "next-intl";

import { cn } from "@modulo/ui/lib/utils";
import type { Period } from "@modulo/sales-analytics/lib/period";

// ---------------------------------------------------------------------------
// PeriodFilter
// ---------------------------------------------------------------------------

export interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: Period[] = ["7d", "30d", "90d", "ytd"];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const t = useTranslations("modules.salesAnalytics.overview.periods");

  return (
    <div
      className="flex items-center gap-1 rounded-md border border-border-subtle bg-surface-1 p-1"
      role="group"
      aria-label="Sélection de période"
    >
      {PERIODS.map((period) => {
        const isActive = period === value;
        return (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            aria-pressed={isActive}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive
                ? "bg-surface-3 text-text-primary"
                : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            {t(period)}
          </button>
        );
      })}
    </div>
  );
}
