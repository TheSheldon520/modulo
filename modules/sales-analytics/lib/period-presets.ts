// modules/sales-analytics/lib/period-presets.ts
//
// Pure-isomorphic single source of truth for the Kanban/Deals filter period
// presets — extends the 4-value Period enum from T1.4 with an "all" preset
// that means "no date filtering" (Kanban-only concept).
//
// Design decision: kept as a SEPARATE file from lib/period.ts because:
//   (a) The T1.4 overview procedure relies on the strict 4-value enum and must
//       remain intact — adding "all" to periodSchema would break its Zod input.
//   (b) "all" is a purely client-side UI concept (no SQL equivalent); it does
//       not need to live next to the date-arithmetic helpers that generate SQL
//       WHERE clauses.
//   (c) Mirrors the STAGES pattern: a file = a domain = a const array = a Zod
//       schema.
//
// Consumers: `apps/web/lib/sales-deal-filters.ts` (pure filter logic) and
// `deal-filters.tsx` (UI component). Both import via the
// `@modulo/sales-analytics/lib/period-presets` sub-export.
//
// No server-only imports — isomorphic, usable in client and test environments.

import { z } from "zod";

import { resolvePeriodRange, type Period } from "./period";

// ---------------------------------------------------------------------------
// Schema + type
// ---------------------------------------------------------------------------

/**
 * The "all" preset means "no date filter applied" — Kanban shows every deal
 * regardless of its createdAt. The other four values are forwarded to
 * `resolvePeriodRange` from lib/period.ts, reusing the same date arithmetic.
 */
export const periodPresetSchema = z.enum(["all", "7d", "30d", "90d", "ytd"]);
export type PeriodPreset = z.infer<typeof periodPresetSchema>;

// ---------------------------------------------------------------------------
// Descriptor shape + source array
// ---------------------------------------------------------------------------

export interface PeriodPresetDescriptor {
  id: PeriodPreset;
  /**
   * i18n key suffix — callers resolve `t(\`filters.period.\${preset.label}\`)`.
   * Kept as the same string as `id` so the mapping is trivial and consistent
   * with the STAGES pattern (`label: DealStage`).
   */
  label: PeriodPreset;
}

/**
 * Ordered list of period presets for the Deals filter bar.
 * **Iterate over THIS** — never hardcode `["all", "7d", ...]` in JSX.
 */
export const PERIOD_PRESETS = [
  { id: "all", label: "all" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "ytd", label: "ytd" },
] as const satisfies readonly PeriodPresetDescriptor[];

// ---------------------------------------------------------------------------
// Date-match helper
// ---------------------------------------------------------------------------

/**
 * Returns `true` iff `createdAt` falls within the preset's window relative to
 * `now`. The `now` parameter is explicit so the function is deterministically
 * testable (same pattern as `resolvePeriodRange`).
 *
 * - "all" → always true (no date filter).
 * - "7d" / "30d" / "90d" / "ytd" → delegates to `resolvePeriodRange` from
 *   lib/period.ts, keeping a single source of date arithmetic.
 */
export function matchesPeriodPreset(
  createdAt: Date,
  preset: PeriodPreset,
  now: Date,
): boolean {
  if (preset === "all") return true;

  // Cast is safe: we excluded "all" above, so preset is a valid Period.
  const range = resolvePeriodRange(preset as Period, now);
  return createdAt >= range.start && createdAt <= range.end;
}
