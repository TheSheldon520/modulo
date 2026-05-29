// modules/sales-analytics/lib/closed-at.ts
//
// Pure isomorphic helper that encodes the closedAt business rule for deal
// stage transitions.
//
// Rule (aligned with overview KPIs that filter on stage='won' AND closedAt BETWEEN):
//   - Entering a "closed" lifecycle (won or lost) → set closedAt = now()
//     BUT only if closedAt is currently null (preserve an already-set date).
//     Rationale: S6 scenario — drag Won → Lost keeps the original won date.
//   - Entering an "open" lifecycle (lead, qualified, proposal) → clear closedAt
//     to null (the deal is active again, its former close date is invalid).
//   - No stage change in the update payload → return undefined (sentinel: do not
//     include closedAt in the Drizzle SET at all — avoid touching an unrelated
//     field).
//
// The sentinel `undefined` (not `null`) is intentional: `null` means "set the
// column to NULL in the DB", whereas `undefined` means "omit from the SET
// clause entirely". Callers must check `=== undefined` before including the
// value in the update payload.
//
// No server imports — this file is isomorphic so tests can import it without
// any Node/Drizzle/tRPC context. The `Date` usage is the built-in global.

import type { DealStage } from "../schemas";
import { isClosedStage, isOpenStage } from "./stages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * `undefined`  → sentinel: do not touch closedAt in the SET clause
 * `null`       → set closedAt = NULL (deal re-opened)
 * `Date`       → set closedAt = that specific Date
 *
 * Callers should apply the value only when it is NOT `undefined`:
 * ```ts
 * const resolved = resolveClosedAt(current.closedAt, input.stage);
 * if (resolved !== undefined) updateData.closedAt = resolved;
 * ```
 */
export type ClosedAtResolution = Date | null | undefined;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Computes the value that `closedAt` should take after a stage transition.
 *
 * @param currentClosedAt  The deal's current `closedAt` value from the DB.
 * @param newStage         The stage being set (undefined if the update payload
 *                         does not include a stage change).
 * @param now              Optional clock injection for tests (defaults to `new Date()`).
 *
 * @returns
 *   - `undefined`  — no stage change, leave closedAt untouched
 *   - `null`       — re-entering an open stage; clear the close date
 *   - `Date`       — entering won/lost; use `currentClosedAt` if already set,
 *                    otherwise the current time
 */
export function resolveClosedAt(
  currentClosedAt: Date | null,
  newStage: DealStage | undefined,
  now: Date = new Date(),
): ClosedAtResolution {
  // No stage change → sentinel: caller must NOT include closedAt in SET
  if (newStage === undefined) {
    return undefined;
  }

  if (isClosedStage(newStage)) {
    // Preserve an already-set close date (S6: drag Won → Lost keeps original date)
    return currentClosedAt ?? now;
  }

  if (isOpenStage(newStage)) {
    // Re-opening a deal: invalidate any previous close date
    return null;
  }

  // Exhaustive guard — should never be reached if DealStage enum is in sync
  // with STAGES. Returns undefined (no-op) so callers degrade gracefully.
  return undefined;
}
