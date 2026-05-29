// apps/web/lib/sales-overview-format.ts
//
// Pure formatting helpers for the Sales Analytics overview dashboard.
// No React, no I/O — fully testable in a bare Vitest node environment.
//
// Kept in `apps/web/lib/` (not `packages/ui/lib/`) because the helpers are
// specific to the salesAnalytics overview domain (stage color mapping,
// overview-specific formatters). Shared with both Server and Client
// Components — no "use client" needed.

// ---------------------------------------------------------------------------
// Revenue compact formatter
// ---------------------------------------------------------------------------

const compactFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Format a number as a compact euro amount for KPI cards.
 * Examples: 204000 → "204 k€", 1500000 → "1,5 M€", 500 → "500 €"
 */
export function formatRevenueCompact(amount: number): string {
  return compactFormatter.format(amount);
}

// ---------------------------------------------------------------------------
// Stage → Donut/chart color
// ---------------------------------------------------------------------------

const STAGE_DONUT_COLORS: Record<string, string> = {
  lead: "var(--color-info)",
  qualified: "var(--color-text-tertiary)",
  proposal: "var(--color-warning)",
  won: "var(--color-success)",
  lost: "var(--color-danger)",
};

const FALLBACK_DONUT_COLOR = "var(--color-surface-3)";

/**
 * Returns the CSS color variable to use for a given stage in dataviz contexts
 * (donut chart slices). Aligns semantically with the stage badge mapping in
 * `deal-format.ts`.
 */
export function getStageDonutColor(stage: string): string {
  return STAGE_DONUT_COLORS[stage] ?? FALLBACK_DONUT_COLOR;
}

// ---------------------------------------------------------------------------
// Month label formatter (for chart X-axis)
// ---------------------------------------------------------------------------

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});

/**
 * Format a "YYYY-MM" string as a short French month label.
 * Example: "2026-01" → "janv. 2026"
 */
export function formatMonthLabel(yearMonth: string): string {
  // Parse as first day of month in UTC
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return monthFormatter.format(date);
}

// ---------------------------------------------------------------------------
// Conversion rate formatter
// ---------------------------------------------------------------------------

/**
 * Format a conversion rate (0–100 range, from the tRPC procedure) as a
 * percentage string for KPI display.
 * Example: 66.666... → "66.7 %"
 */
export function formatConversionRate(rate: number): string {
  return `${rate.toFixed(1)} %`;
}

// ---------------------------------------------------------------------------
// Sparkline variance guard
// ---------------------------------------------------------------------------

/**
 * Tells the caller whether a sparkline series carries a visually-useful
 * variation. Recharts' `<AreaChart>` happily renders a flat line + gradient
 * fill when the series is constant — the result reads as a coloured stripe at
 * the bottom of the card, indistinguishable from a placeholder skeleton. Rather
 * than rendering that, we hide the sparkline entirely (the card shows the value
 * alone), keeping the KPI grid visually consistent.
 *
 * Returns true iff the series has at least two points AND not all `y` values
 * are equal — i.e. there is a real trend to display.
 */
export function hasMeaningfulVariation(
  series: readonly { x: string; y: number }[],
): boolean {
  if (series.length < 2) return false;
  const firstY = series[0]?.y;
  if (firstY === undefined) return false;
  return series.some((point) => point.y !== firstY);
}
