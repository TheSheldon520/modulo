"use client";
// "use client" justification: event handlers (onClick) for the toggle buttons.

import { LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";

export type DealView = "kanban" | "table";

interface ViewToggleProps {
  value: DealView;
  onChange: (view: DealView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const t = useTranslations("modules.salesAnalytics.deals.view");

  return (
    <div
      className="flex items-center gap-px rounded-md border border-border-subtle bg-surface-1 p-0.5"
      role="group"
      aria-label={t("groupAriaLabel")}
    >
      <button
        type="button"
        onClick={() => onChange("kanban")}
        aria-pressed={value === "kanban"}
        aria-label={t("kanban")}
        title={t("kanban")}
        className={[
          "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-120",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          value === "kanban"
            ? "bg-surface-3 text-text-primary shadow-sm"
            : "text-text-tertiary hover:text-text-secondary",
        ].join(" ")}
      >
        <LayoutGrid size={14} strokeWidth={1.5} />
        <span>{t("kanban")}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        aria-pressed={value === "table"}
        aria-label={t("table")}
        title={t("table")}
        className={[
          "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-120",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          value === "table"
            ? "bg-surface-3 text-text-primary shadow-sm"
            : "text-text-tertiary hover:text-text-secondary",
        ].join(" ")}
      >
        <List size={14} strokeWidth={1.5} />
        <span>{t("table")}</span>
      </button>
    </div>
  );
}
