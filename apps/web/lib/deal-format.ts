// apps/web/lib/deal-format.ts
//
// Pure helpers for the Sales Analytics Deals UI. No React, no I/O — fully
// testable in a bare Vitest node environment without jsdom.
//
// Kept in `apps/web/lib/` (not `packages/ui/lib/`) because the semantic badge
// mapping is specific to the salesAnalytics module's DEAL_STAGES contract; it
// should not leak into the shared UI package.

// Import from the pure schemas module — not the router barrel — so this
// helper stays consumable by both server and client without any bundler
// having to reason about whether @trpc/server should be tree-shaken.
import type { DealStage } from "@modulo/sales-analytics/schemas";

// ---------------------------------------------------------------------------
// Amount formatting
// ---------------------------------------------------------------------------

/**
 * Formats a wire-format decimal string (e.g. "12500.50") as a fr-FR euro
 * currency string (e.g. "12 500,50 €").
 *
 * `amount` arrives from the tRPC wire as a string (`numeric` Drizzle type).
 * We parseFloat before formatting — precision loss above 2^53 is irrelevant
 * for the currency values we handle in practice (< billions).
 */
const amountFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatDealAmount(amount: string): string {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return amount;
  return amountFormatter.format(parsed);
}

// ---------------------------------------------------------------------------
// Stage → badge classes
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind classes for the semantic status badge of a given deal stage.
 * Uses the `bg-{semantic}/10 text-{semantic}` pattern documented in
 * DESIGN_SYSTEM.md §5 "Status badges (pattern subtil)".
 *
 * Unknown stages fall back to a neutral secondary surface so the UI never
 * throws on unexpected data (e.g. a future stage added server-side before the
 * client deploys).
 */
const STAGE_BADGE_CLASSES: Record<DealStage, string> = {
  lead: "bg-info/10 text-info",
  // `qualified` is an intermediate funnel state — render with a neutral
  // (yet visible) badge rather than a charged semantic colour. Modulo's
  // design system does not define a `primary` token; this row used to
  // emit transparent at runtime.
  qualified: "bg-text-tertiary/10 text-text-secondary",
  proposal: "bg-warning/10 text-warning",
  won: "bg-success/10 text-success",
  lost: "bg-danger/10 text-danger",
};

const FALLBACK_BADGE_CLASSES = "bg-surface-2 text-text-secondary";

export function getStageBadgeClasses(stage: string): string {
  return STAGE_BADGE_CLASSES[stage as DealStage] ?? FALLBACK_BADGE_CLASSES;
}
