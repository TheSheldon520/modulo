// apps/web/lib/sales-deal-filters.ts
//
// Pure filter logic for the Sales Analytics Deals view (Kanban + Table).
// No React, no I/O — fully testable in a bare Vitest node environment.
//
// Architecture pattern (mirrors sales-overview-format.ts, deal-format.ts):
//   - Kept in `apps/web/lib/` because it is specific to the salesAnalytics
//     Deals UI and should not leak into packages/ui.
//   - All functions take explicit parameters rather than reading global state,
//     making them deterministically testable without mocks.
//   - `now: Date` is always passed explicitly (T1.4 convention from period.ts).
//
// Consumers:
//   - `deals-view.tsx`     — applies filters after tRPC useQuery
//   - `deal-filters.tsx`   — reads/writes URL search params
//   - `sales-deal-filters.test.ts` — Vitest unit tests

import { z } from "zod";

import {
  periodPresetSchema,
  matchesPeriodPreset,
  type PeriodPreset,
} from "@modulo/sales-analytics/lib/period-presets";

// ---------------------------------------------------------------------------
// FilterableDeal — minimal shape required for filter evaluation
// ---------------------------------------------------------------------------

/**
 * Subset of the tRPC deals.list row shape. Only the fields used by the filter
 * logic are declared here — callers pass the full DealRow and TypeScript
 * structural typing ensures compatibility.
 */
export interface FilterableDeal {
  createdAt: Date | string;
  amount: string;
  ownerId: string;
  ownerName: string | null;
}

// ---------------------------------------------------------------------------
// DealFilters — the filter state shape
// ---------------------------------------------------------------------------

export interface DealFilters {
  period: PeriodPreset;
  /** Inclusive minimum amount in EUR. `null` = no lower bound. */
  amountMin: number | null;
  /** Inclusive maximum amount in EUR. `null` = no upper bound. */
  amountMax: number | null;
  /** Owner user ID to filter on. `null` = no owner filter (all owners). */
  ownerId: string | null;
}

/** Sentinel for "all owners" in the owner select — avoids Radix value="" bug. */
// Not `as const` (lint: no-unnecessary-type-assertion) nor `: string`
// (lint: no-inferrable-types). TypeScript infers `"__all__"` as the literal
// type for a const string — sufficient for use as a Select value sentinel.
export const ALL_OWNERS = "__all__";

/** The baseline "no filters active" state. Used as the URL-parse fallback. */
export const EMPTY_FILTERS: DealFilters = {
  period: "all",
  amountMin: null,
  amountMax: null,
  ownerId: null,
};

// ---------------------------------------------------------------------------
// hasActiveFilters
// ---------------------------------------------------------------------------

/**
 * Returns `true` iff at least one filter deviates from EMPTY_FILTERS.
 * Used by the UI to show the "Reset filters" button conditionally.
 */
export function hasActiveFilters(filters: DealFilters): boolean {
  return (
    filters.period !== "all" ||
    filters.amountMin !== null ||
    filters.amountMax !== null ||
    filters.ownerId !== null
  );
}

// ---------------------------------------------------------------------------
// applyDealFilters — pure combinatorial AND filter
// ---------------------------------------------------------------------------

/**
 * Filters an array of deals by all active criteria. All filters are combined
 * with AND semantics: a deal must satisfy every active filter to appear.
 *
 * `now` is passed explicitly (T1.4 pattern) to make this function
 * deterministically testable without mocking global time.
 *
 * Notes on drag & drop integration (Phase 3 / Phase 5 coexistence):
 *   After an optimistic update, `deals-kanban.tsx` mutates the tRPC cache via
 *   `setData`. `DealsView` reads the same cache via `useQuery`, so the moved
 *   deal is re-evaluated against active filters on the next render naturally —
 *   no special handling needed. A won deal dragged to "lost" while a period
 *   filter is active will disappear from the filtered view if its createdAt is
 *   outside the window — expected behaviour.
 */
export function applyDealFilters<T extends FilterableDeal>(
  deals: readonly T[],
  filters: DealFilters,
  now: Date,
): T[] {
  // Fast path: no active filter → return every deal (spread to get a mutable copy)
  if (!hasActiveFilters(filters)) return [...deals];

  return deals.filter((deal) => {
    // --- Period filter ---
    const createdAt =
      typeof deal.createdAt === "string"
        ? new Date(deal.createdAt)
        : deal.createdAt;
    if (!matchesPeriodPreset(createdAt, filters.period, now)) return false;

    // --- Amount filters ---
    const amount = parseFloat(deal.amount);
    if (!isNaN(amount)) {
      if (filters.amountMin !== null && amount < filters.amountMin) return false;
      if (filters.amountMax !== null && amount > filters.amountMax) return false;
    }

    // --- Owner filter ---
    if (filters.ownerId !== null && deal.ownerId !== filters.ownerId)
      return false;

    return true;
  });
}

// ---------------------------------------------------------------------------
// URL search params schema + parse / serialize
// ---------------------------------------------------------------------------

/**
 * Zod schema for the URL representation of DealFilters. Each value is optional
 * (absent = use EMPTY_FILTERS default). `coerce` for amounts handles the string
 * representation that URLSearchParams always gives.
 */
export const dealFiltersUrlSchema = z.object({
  period: periodPresetSchema.optional(),
  amountMin: z.coerce.number().min(0).optional(),
  amountMax: z.coerce.number().min(0).optional(),
  ownerId: z.string().uuid().optional(),
});

/**
 * Parse Next.js URLSearchParams (or any compatible record) into a typed
 * DealFilters object. Invalid or corrupted values fall back to the corresponding
 * EMPTY_FILTERS default — this function NEVER throws.
 *
 * Approach: each field is parsed independently so a corrupt `ownerId` does not
 * wipe out a valid `period`. This is more defensive than a single top-level
 * safeParse which would return an error object if ANY field is invalid.
 */
export function parseFiltersFromUrl(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): DealFilters {
  // Normalise to a plain Record<string, string> — URLSearchParams and
  // plain objects both work; array values pick the first element.
  const raw: Record<string, string> = {};

  if (params instanceof URLSearchParams) {
    params.forEach((value, key) => {
      raw[key] = value;
    });
  } else {
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        raw[key] = value;
      } else if (Array.isArray(value) && value[0] !== undefined) {
        raw[key] = value[0];
      }
    }
  }

  // Parse each field independently — a failure on one does not affect others.
  const periodResult = periodPresetSchema.safeParse(raw.period);
  const period: PeriodPreset = periodResult.success
    ? periodResult.data
    : EMPTY_FILTERS.period;

  const amountMinResult = z.coerce.number().min(0).safeParse(raw.amountMin);
  const amountMin: number | null =
    raw.amountMin !== undefined && amountMinResult.success
      ? amountMinResult.data
      : null;

  const amountMaxResult = z.coerce.number().min(0).safeParse(raw.amountMax);
  const amountMax: number | null =
    raw.amountMax !== undefined && amountMaxResult.success
      ? amountMaxResult.data
      : null;

  const ownerIdResult = z.string().uuid().safeParse(raw.ownerId);
  const ownerId: string | null =
    raw.ownerId !== undefined && ownerIdResult.success
      ? ownerIdResult.data
      : null;

  return { period, amountMin, amountMax, ownerId };
}

/**
 * Serialise DealFilters to a `Record<string, string>` suitable for constructing
 * URLSearchParams. Values equal to their EMPTY_FILTERS default are omitted to
 * keep URLs clean (e.g. `?period=all&ownerId=null` is never produced).
 *
 * Usage: `router.replace(\`?\${new URLSearchParams(serializeFiltersToUrl(f)).toString()}\`)`
 */
export function serializeFiltersToUrl(
  filters: DealFilters,
): Record<string, string> {
  const out: Record<string, string> = {};

  if (filters.period !== "all") {
    out.period = filters.period;
  }
  if (filters.amountMin !== null) {
    out.amountMin = String(filters.amountMin);
  }
  if (filters.amountMax !== null) {
    out.amountMax = String(filters.amountMax);
  }
  if (filters.ownerId !== null) {
    out.ownerId = filters.ownerId;
  }

  return out;
}
