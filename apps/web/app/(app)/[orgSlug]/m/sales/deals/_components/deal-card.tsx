"use client";
// "use client" justification: this component is rendered inside <DealsKanban>
// which is a Client Component. Phase 3 adds useDraggable (dnd-kit), requiring
// client-side execution for drag event handling and isDragging state.

import { Building2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDraggable } from "@dnd-kit/core";

import { formatDealAmount } from "@/lib/deal-format";
import { getOwnerInitials } from "@/lib/owner-avatar";

// Type is inferred from the tRPC AppRouter — no manual type duplication.
// `RouterOutputs["salesAnalytics"]["deals"]["list"][number]` gives the row shape
// including the newly joined ownerName / contactName / contactCompany fields.
import type { AppRouter } from "@modulo/api";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type DealRow = RouterOutputs["salesAnalytics"]["deals"]["list"][number];

interface DealCardProps {
  deal: DealRow;
  /**
   * When true, the card is a static overlay clone rendered by <DragOverlay>.
   * No drag bindings are attached — the parent DndContext already handles
   * positioning.
   */
  isOverlay?: boolean;
  /**
   * Called when the user clicks the card without dragging it (drag activation
   * distance is 8px — any movement < 8px is treated as a click by dnd-kit).
   * Not wired for the overlay clone.
   */
  onClick?: (deal: DealRow) => void;
}

export function DealCard({ deal, isOverlay = false, onClick }: DealCardProps) {
  const t = useTranslations("modules.salesAnalytics.deals");

  // useDraggable must always be called (hooks rule), but its refs/listeners
  // are intentionally NOT applied when isOverlay=true — the DragOverlay clone
  // is purely visual and must not receive drag events.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { type: "card", deal },
    // Disabled for the overlay clone — the original source node is the draggable
    disabled: isOverlay,
  });

  // Contact display priority: contactCompany (enseigne) > contactName > nothing
  // In a retail B2B context (Silverlit → Carrefour/Picwic/Leclerc) the enseigne
  // is the most valuable label on the card — show it first.
  const contactDisplay = deal.contactCompany ?? deal.contactName ?? null;
  const isCompany = deal.contactCompany !== null;

  const ownerInitials = getOwnerInitials(deal.ownerName);
  // Tooltip text via i18n — accessible for screen readers
  const ownerLabel = t("kanban.cardOwnerLabel", {
    name: deal.ownerName ?? t("kanban.noOwner"),
  });

  return (
    <article
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      // onClick fires after a short press (< 8px drag activation distance).
      // dnd-kit's PointerSensor with { distance: 8 } suppresses this handler
      // during actual drags — a real drag never triggers onClick.
      onClick={!isOverlay && onClick ? () => onClick(deal) : undefined}
      className={[
        "group relative flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-1 p-3",
        "transition-colors duration-150",
        // Source card ghost effect during drag
        isDragging && !isOverlay
          ? "opacity-40 cursor-grabbing border-border-default"
          : "",
        // Normal hover state (not when dragging or overlay)
        !isDragging && !isOverlay
          ? "hover:bg-surface-2 hover:border-border-default cursor-grab"
          : "",
        // DragOverlay clone: slightly elevated + subtle rotation for "picked up" feel
        isOverlay ? "shadow-md rotate-1 cursor-grabbing" : "",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={deal.name}
    >
      {/* Owner avatar — top-right corner, initials in accent-muted circle */}
      <div
        className="absolute right-3 top-3 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-2xs font-semibold text-accent"
        title={ownerLabel}
        aria-label={ownerLabel}
      >
        {ownerInitials}
      </div>

      {/* Line 1: Deal name — give right padding so it doesn't collide with the avatar */}
      <p className="truncate pr-9 text-sm font-medium leading-snug text-text-primary">
        {deal.name}
      </p>

      {/* Line 2: Contact / enseigne — most valuable info in retail B2B context */}
      {contactDisplay !== null ? (
        <div className="flex items-center gap-1.5">
          {isCompany ? (
            <Building2
              size={12}
              strokeWidth={1.5}
              className="shrink-0 text-text-tertiary"
              aria-hidden
            />
          ) : (
            <User
              size={12}
              strokeWidth={1.5}
              className="shrink-0 text-text-tertiary"
              aria-hidden
            />
          )}
          <span className="truncate text-xs text-text-secondary">
            {contactDisplay}
          </span>
        </div>
      ) : null}

      {/* Line 3: Amount in font-mono for digit alignment */}
      <p className="font-mono text-xs text-text-tertiary">
        {formatDealAmount(deal.amount)}
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// DealCardOverlay — convenience wrapper rendered inside <DragOverlay>.
// Passes isOverlay=true so the clone has no drag bindings + elevated style.
// ---------------------------------------------------------------------------

export function DealCardOverlay({ deal }: { deal: DealRow }) {
  return <DealCard deal={deal} isOverlay />;
}
