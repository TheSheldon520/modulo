"use client";
// "use client" justification: uses tRPC useQuery + useMutation (client data
// fetching + optimistic updates), dnd-kit DndContext + sensors (requires
// browser event listeners), and sonner toast (imperative browser API).

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  defaultKeyboardCoordinateGetter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { STAGES } from "@modulo/sales-analytics/lib/stages";
import type { DealStage } from "@modulo/sales-analytics/schemas";

import { trpc } from "@/lib/trpc/client";

import { KanbanColumn } from "./kanban-column";
import { DealCardOverlay, type DealRow } from "./deal-card";
import { DealSidePanel } from "./deal-side-panel";

// ---------------------------------------------------------------------------
// Skeleton — 5 columns mimicking the Kanban layout
// ---------------------------------------------------------------------------

function KanbanColumnSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-surface-3" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-3" />
        </div>
        <div className="size-5 animate-pulse rounded-full bg-surface-3" />
      </div>
      {/* Card skeletons */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded-lg bg-surface-3"
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  const t = useTranslations("modules.salesAnalytics.deals");
  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4"
      aria-busy="true"
      aria-label={t("kanban.loading")}
    >
      {STAGES.map((stage) => (
        <KanbanColumnSkeleton key={stage.id} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — shown when there are zero deals across all stages
// ---------------------------------------------------------------------------

function KanbanEmptyState() {
  const t = useTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
        <TrendingUp className="size-5 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">
          {t("empty.title")}
        </p>
        <p className="text-sm text-text-secondary">{t("empty.description")}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function KanbanErrorState() {
  const t = useTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex items-center justify-center rounded-lg border border-border-subtle bg-surface-1 px-6 py-12">
      <p className="text-sm text-danger">{t("error.loadingFailed")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grouping helper — manual reduce instead of Object.groupBy for compatibility
// ---------------------------------------------------------------------------

/**
 * Groups an array of DealRow by their `stage` field.
 * Uses a manual reduce rather than Object.groupBy for broad browser compat
 * (Object.groupBy requires Chrome 117+ / Node 21+, not available everywhere).
 */
function groupDealsByStage(deals: DealRow[]): Record<string, DealRow[]> {
  return deals.reduce<Record<string, DealRow[]>>((acc, deal) => {
    const bucket = acc[deal.stage] ?? [];
    bucket.push(deal);
    acc[deal.stage] = bucket;
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DealsKanbanProps {
  /**
   * The filtered deal list from DealsView. When `undefined`, the kanban is
   * loading. When defined (even empty array), the deals have been fetched and
   * filtered — the Kanban renders accordingly.
   *
   * Note: the kanban ALSO subscribes to the tRPC cache for its own optimistic
   * mutations. `filteredDeals` is used for DISPLAY only — the mutation targets
   * the full cache via `utils.salesAnalytics.deals.list`.
   */
  filteredDeals: DealRow[] | undefined;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DealsKanban({ filteredDeals }: DealsKanbanProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  const utils = trpc.useUtils();

  // Track which deal is being dragged for the DragOverlay preview
  const [activeDeal, setActiveDeal] = useState<DealRow | null>(null);

  // Side panel state — which deal is currently open for editing
  const [selectedDeal, setSelectedDeal] = useState<DealRow | null>(null);

  // We still need to know if the underlying query errored — use the full
  // (unfiltered) status so we can show the error state properly.
  const { status } = trpc.salesAnalytics.deals.list.useQuery();

  // Sensors:
  //   PointerSensor with distance:8 → no accidental drag on a simple click
  //     (critical once Phase 4 adds click-to-open side panel).
  //   KeyboardSensor → a11y keyboard drag (Tab + Space + Arrow keys).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      // defaultKeyboardCoordinateGetter: moves the drag target via Arrow keys.
      // This is the standard a11y getter from @dnd-kit/core — no sortable
      // dependency needed for a pure Kanban (no intra-column reorder).
      coordinateGetter: defaultKeyboardCoordinateGetter,
    }),
  );

  const updateDeal = trpc.salesAnalytics.deals.update.useMutation({
    onMutate: async (variables) => {
      // 1. Cancel in-flight queries to avoid a race with our optimistic update
      await utils.salesAnalytics.deals.list.cancel();

      // 2. Snapshot current cache for rollback
      const previous = utils.salesAnalytics.deals.list.getData();

      // 3. Capture the original stage BEFORE we apply the optimistic update
      const originalDeal = previous?.find((d) => d.id === variables.id);
      const originalStage = originalDeal?.stage as DealStage | undefined;

      // 4. Apply optimistic update — move the card immediately in the UI
      utils.salesAnalytics.deals.list.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((d) =>
          d.id === variables.id && variables.stage !== undefined
            ? { ...d, stage: variables.stage as string }
            : d,
        );
      });

      return { previous, originalStage };
    },

    onError: (_err, _variables, context) => {
      // Rollback: restore the snapshot captured in onMutate
      if (context?.previous) {
        utils.salesAnalytics.deals.list.setData(undefined, context.previous);
      }
      toast.error(t("kanban.dragError"));
    },

    onSuccess: (_data, variables, context) => {
      // Show success toast with Undo action — only when we have a previous
      // stage to revert to (i.e. an actual stage-change drag happened)
      if (context?.originalStage && variables.stage !== undefined) {
        const revertStage = context.originalStage;
        toast(t("kanban.dragSuccess"), {
          action: {
            label: t("kanban.undo"),
            onClick: () => {
              updateDeal.mutate({ id: variables.id, stage: revertStage });
            },
          },
          duration: 5000,
        });
      }
    },

    onSettled: () => {
      // Re-fetch to reconcile with server state (closedAt, etc.)
      void utils.salesAnalytics.deals.list.invalidate();
      // Overview KPIs may change (won revenue, pipeline value)
      void utils.salesAnalytics.overview.invalidate();
    },
  });

  // -------------------------------------------------------------------------
  // Drag handlers
  // -------------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    const draggedDeal = event.active.data.current?.deal as DealRow | undefined;
    setActiveDeal(draggedDeal ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);

    const { active, over } = event;
    if (!over) return; // Dropped outside any column — no-op

    const dealId = active.id as string;
    const targetStageId = over.id as DealStage;

    // Determine the current stage from the active drag data
    const currentDeal = active.data.current?.deal as DealRow | undefined;
    const currentStage = currentDeal?.stage;

    // Drop on the same column → no-op (no mutation, no network request)
    if (targetStageId === currentStage) return;

    // Validate that the target is a known stage before mutating
    const isKnownStage = STAGES.some((s) => s.id === targetStageId);
    if (!isKnownStage) return;

    updateDeal.mutate({ id: dealId, stage: targetStageId });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (status === "pending" || filteredDeals === undefined) {
    return <KanbanSkeleton />;
  }

  if (status === "error") {
    return <KanbanErrorState />;
  }

  // Global empty state — org has zero deals total (no filter in play here;
  // DealsView handles the "filtered empty" case before rendering this component)
  if (filteredDeals.length === 0) {
    return <KanbanEmptyState />;
  }

  const dealsByStage = groupDealsByStage(filteredDeals);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {/* STAGES.map — never a hardcoded array, always the single source of truth */}
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] ?? []}
                onCardClick={setSelectedDeal}
              />
            ))}
          </div>
        </div>

        {/* DragOverlay: renders a floating copy of the card under the cursor.
            Must be at the DndContext level (not inside a column) to avoid
            portal/z-index issues with the column overflow:auto. */}
        <DragOverlay dropAnimation={null}>
          {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>

      {/* DealSidePanel: Radix Sheet portal renders outside the DndContext DOM
          subtree — no z-index conflict with DragOverlay. */}
      <DealSidePanel
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </>
  );
}
