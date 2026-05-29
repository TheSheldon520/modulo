"use client";
// "use client" justification: uses useDroppable from dnd-kit — requires
// browser event listeners and DOM refs for drag-over detection.

import { useTranslations } from "next-intl";
import { useDroppable } from "@dnd-kit/core";

import type { StageDescriptor } from "@modulo/sales-analytics/lib/stages";
import {
  getKanbanColumnDotClasses,
  getKanbanColumnHeaderClasses,
} from "@/lib/sales-deal-stages-ui";

import { DealCard, type DealRow } from "./deal-card";

interface KanbanColumnProps {
  stage: StageDescriptor;
  deals: DealRow[];
  /** Called when a card is clicked (short press, not a drag). */
  onCardClick?: (deal: DealRow) => void;
}

export function KanbanColumn({ stage, deals, onCardClick }: KanbanColumnProps) {
  const t = useTranslations("modules.salesAnalytics.deals");

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
  });

  const headerTextClass = getKanbanColumnHeaderClasses(stage.color);
  const dotClass = getKanbanColumnDotClasses(stage.color);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {/* Colour dot — subtle stage indicator */}
          <span
            className={`size-2 shrink-0 rounded-full ${dotClass}`}
            aria-hidden
          />
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${headerTextClass}`}
          >
            {t(`stages.${stage.label}`)}
          </span>
        </div>
        {/* Deal count badge */}
        <span className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-2xs font-medium text-text-tertiary tabular-nums">
          {deals.length}
        </span>
      </div>

      {/* Drop zone — visual highlight when a card hovers over this column */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-2 rounded-lg min-h-16 p-1 transition-colors duration-120",
          isOver
            ? "bg-surface-2 ring-1 ring-border-default"
            : "bg-transparent",
        ].join(" ")}
      >
        {deals.length === 0 ? (
          <div
            className={[
              "flex items-center justify-center rounded-lg border border-dashed px-4 py-6",
              isOver ? "border-border-default" : "border-border-subtle",
            ].join(" ")}
          >
            <p className="text-xs text-text-tertiary">
              {t("kanban.column.empty")}
            </p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
