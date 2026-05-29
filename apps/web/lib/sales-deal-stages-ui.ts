// apps/web/lib/sales-deal-stages-ui.ts
//
// Pure UI mapping helpers for the Sales Analytics deal stage colours.
// No React, no I/O — fully testable in a bare Vitest node environment.
//
// Kept in `apps/web/lib/` (same pattern as `deal-format.ts` and
// `sales-overview-format.ts`) because these helpers are specific to the
// salesAnalytics module UI layer and should not leak into the shared
// `packages/ui` package.
//
// Consumers:
//   - `deals-kanban/kanban-column.tsx` — column header accent colour
//   - Future: drag-over highlight, deal-card border accent (Phase 3+)

import type { StageColor } from "@modulo/sales-analytics/lib/stages";

// ---------------------------------------------------------------------------
// Kanban column header — text + indicator colour
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind text-colour classes for the column header label of a Kanban
 * stage. Uses the design-system semantic tokens (no hardcoded hex). The
 * `neutral` stage ("qualified") falls back to `text-text-secondary` since there
 * is no neutral semantic token distinct from the surface.
 *
 * Mapping rationale (mirrors `deal-format.ts` badge mapping for consistency):
 *   info    → text-info         (lead — new discovery)
 *   neutral → text-text-secondary (qualified — no semantic charge)
 *   warning → text-warning      (proposal — attention required)
 *   success → text-success      (won — closed positively)
 *   danger  → text-danger       (lost — closed negatively)
 */
const KANBAN_HEADER_TEXT_CLASSES: Record<StageColor, string> = {
  info: "text-info",
  neutral: "text-text-secondary",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
};

export function getKanbanColumnHeaderClasses(color: StageColor): string {
  return KANBAN_HEADER_TEXT_CLASSES[color];
}

// ---------------------------------------------------------------------------
// Kanban column header — subtle background indicator dot
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind background-colour classes for the small colour-coded dot
 * rendered alongside the column header label. Keeps visual weight low
 * (uses `/60` opacity on the background so it reads as a hint, not a badge).
 */
const KANBAN_HEADER_DOT_CLASSES: Record<StageColor, string> = {
  info: "bg-info/60",
  neutral: "bg-text-tertiary/40",
  warning: "bg-warning/60",
  success: "bg-success/60",
  danger: "bg-danger/60",
};

export function getKanbanColumnDotClasses(color: StageColor): string {
  return KANBAN_HEADER_DOT_CLASSES[color];
}
