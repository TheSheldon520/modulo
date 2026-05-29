// modules/sales-analytics/lib/period.ts
//
// Pure date-arithmetic helpers for period-based KPI filtering.
//
// No server-only imports (no @trpc/server, no Drizzle, no @modulo/api) — this
// file is intentionally isomorphic so the UI layer can import `Period` and
// `periodSchema` via the `./lib/period` sub-export without dragging server
// code into the browser bundle.
//
// The functions take an explicit `now: Date` parameter (instead of calling
// `new Date()` internally) so they are deterministically testable in Vitest
// without mocking global time.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Period schema + type
// ---------------------------------------------------------------------------

export const periodSchema = z.enum(["7d", "30d", "90d", "ytd"]);
export type Period = z.infer<typeof periodSchema>;

// ---------------------------------------------------------------------------
// Date range shape
// ---------------------------------------------------------------------------

export interface DateRange {
  start: Date;
  end: Date;
}

// ---------------------------------------------------------------------------
// Period resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the [start, end] date range of a period given a reference "now".
 * `end` is always `now`. `start` is derived from the period:
 *   - "7d"  → now minus 7 calendar days
 *   - "30d" → now minus 30 calendar days
 *   - "90d" → now minus 90 calendar days
 *   - "ytd" → January 1st of the current year at 00:00:00 UTC
 */
export function resolvePeriodRange(period: Period, now: Date): DateRange {
  const end = new Date(now);

  let start: Date;
  if (period === "ytd") {
    // First millisecond of the current UTC year.
    start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  } else {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

/**
 * Resolve the [start, end] date range of the *previous* period (same length
 * in days), immediately before the current period's start.
 *
 * For all rolling periods ("7d", "30d", "90d"), "previous" is a window of
 * the same length that ends the instant the current window begins.
 *
 * For "ytd", the "previous" window mirrors the YTD length but shifted back
 * exactly one calendar year (i.e. Jan 1st last year → same day last year).
 * This gives a like-for-like comparison (e.g. if today is Apr 15 2026, current
 * YTD = Jan 1–Apr 15 2026, previous = Jan 1–Apr 15 2025).
 */
export function resolvePreviousPeriodRange(period: Period, now: Date): DateRange {
  const current = resolvePeriodRange(period, now);

  if (period === "ytd") {
    // Shift both bounds back exactly 1 year (UTC month/day preserved).
    const start = new Date(
      Date.UTC(current.start.getUTCFullYear() - 1, 0, 1),
    );
    const end = new Date(
      Date.UTC(
        current.end.getUTCFullYear() - 1,
        current.end.getUTCMonth(),
        current.end.getUTCDate(),
        current.end.getUTCHours(),
        current.end.getUTCMinutes(),
        current.end.getUTCSeconds(),
        current.end.getUTCMilliseconds(),
      ),
    );
    return { start, end };
  }

  // Rolling window: previous ends where current starts, same duration.
  const durationMs = current.end.getTime() - current.start.getTime();
  const end = new Date(current.start);
  const start = new Date(current.start.getTime() - durationMs);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Variation computation
// ---------------------------------------------------------------------------

/**
 * Compute the signed delta and relative percentage change between a current
 * value and a previous value.
 *
 * `percentage` is `null` when `previous === 0` to avoid division by zero;
 * the UI renders a neutral "—" badge in that case rather than ±∞.
 *
 * Examples:
 *   computeVariation(120, 100) → { delta: 20, percentage: 20 }
 *   computeVariation(80,  100) → { delta: -20, percentage: -20 }
 *   computeVariation(50,    0) → { delta: 50, percentage: null }
 *   computeVariation(0,   100) → { delta: -100, percentage: -100 }
 *   computeVariation(0,     0) → { delta: 0, percentage: null }
 */
export function computeVariation(
  current: number,
  previous: number,
): { delta: number; percentage: number | null } {
  const delta = current - previous;
  if (previous === 0) {
    return { delta, percentage: null };
  }
  const percentage = (delta / previous) * 100;
  return { delta, percentage };
}
