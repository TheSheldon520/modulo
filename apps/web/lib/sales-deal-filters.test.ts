// apps/web/lib/sales-deal-filters.test.ts
//
// Unit tests for the pure deal-filter helpers. No DOM, no jsdom, no mocks.
// `now` is always passed explicitly so tests are deterministic.

import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  applyDealFilters,
  hasActiveFilters,
  parseFiltersFromUrl,
  serializeFiltersToUrl,
  type DealFilters,
  type FilterableDeal,
} from "./sales-deal-filters";

// ---------------------------------------------------------------------------
// Frozen reference timestamp: 2026-05-29 12:00:00 UTC
// ---------------------------------------------------------------------------
const NOW = new Date("2026-05-29T12:00:00Z");

// ---------------------------------------------------------------------------
// Helpers — minimal deal fixtures
// ---------------------------------------------------------------------------

function makeDeal(
  overrides: Partial<FilterableDeal> & { createdAt?: Date | string },
): FilterableDeal {
  return {
    createdAt: overrides.createdAt ?? NOW,
    amount: overrides.amount ?? "5000",
    ownerId: overrides.ownerId ?? "user-a",
    ownerName: overrides.ownerName ?? "Alice",
    ...overrides,
  };
}

const DEAL_RECENT = makeDeal({
  createdAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  amount: "10000",
  ownerId: "user-a",
});

const DEAL_OLD = makeDeal({
  createdAt: new Date("2025-01-01T00:00:00Z"), // > 90d ago
  amount: "500",
  ownerId: "user-b",
});

const DEAL_MEDIUM = makeDeal({
  createdAt: new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
  amount: "25000",
  ownerId: "user-a",
});

const ALL_DEALS = [DEAL_RECENT, DEAL_OLD, DEAL_MEDIUM] as const;

// ---------------------------------------------------------------------------
// hasActiveFilters
// ---------------------------------------------------------------------------

describe("hasActiveFilters", () => {
  it("returns false for EMPTY_FILTERS", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when period is not 'all'", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, period: "7d" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, period: "30d" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, period: "90d" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, period: "ytd" })).toBe(true);
  });

  it("returns true when amountMin is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, amountMin: 0 })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, amountMin: 1000 })).toBe(true);
  });

  it("returns true when amountMax is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, amountMax: 50000 })).toBe(true);
  });

  it("returns true when ownerId is set", () => {
    expect(
      hasActiveFilters({ ...EMPTY_FILTERS, ownerId: "some-uuid" }),
    ).toBe(true);
  });

  it("returns true when multiple filters are active", () => {
    expect(
      hasActiveFilters({
        period: "30d",
        amountMin: 1000,
        amountMax: 50000,
        ownerId: "some-uuid",
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — no active filter
// ---------------------------------------------------------------------------

describe("applyDealFilters — no active filter", () => {
  it("returns all deals when filters are EMPTY_FILTERS", () => {
    const result = applyDealFilters(ALL_DEALS, EMPTY_FILTERS, NOW);
    expect(result).toHaveLength(ALL_DEALS.length);
  });

  it("returns empty array when deals array is empty", () => {
    const result = applyDealFilters([], EMPTY_FILTERS, NOW);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — period filter
// ---------------------------------------------------------------------------

describe("applyDealFilters — period filter", () => {
  it('keeps only deals within 7d window when period="7d"', () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, period: "7d" },
      NOW,
    );
    // DEAL_RECENT is 3d ago (in); DEAL_OLD and DEAL_MEDIUM are out
    expect(result).toEqual([DEAL_RECENT]);
  });

  it('keeps deals within 30d window when period="30d"', () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, period: "30d" },
      NOW,
    );
    // DEAL_RECENT (3d) and DEAL_MEDIUM (20d) are in; DEAL_OLD is out
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(DEAL_RECENT);
    expect(result).toContainEqual(DEAL_MEDIUM);
  });

  it("returns empty array when no deals fall in the period", () => {
    // All deals are in the past — use a future "now" that puts them outside 7d
    const futureNow = new Date("2030-01-01T00:00:00Z");
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, period: "7d" },
      futureNow,
    );
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — amount filter
// ---------------------------------------------------------------------------

describe("applyDealFilters — amount filter", () => {
  it("filters by amountMin (inclusive)", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, amountMin: 10000 },
      NOW,
    );
    // DEAL_RECENT=10000 (in), DEAL_OLD=500 (out), DEAL_MEDIUM=25000 (in)
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(DEAL_RECENT);
    expect(result).toContainEqual(DEAL_MEDIUM);
  });

  it("filters by amountMax (inclusive)", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, amountMax: 5000 },
      NOW,
    );
    // DEAL_OLD=500 (in); others out
    expect(result).toEqual([DEAL_OLD]);
  });

  it("filters by amountMin + amountMax range", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, amountMin: 1000, amountMax: 20000 },
      NOW,
    );
    // DEAL_RECENT=10000 (in), DEAL_OLD=500 (out), DEAL_MEDIUM=25000 (out)
    expect(result).toEqual([DEAL_RECENT]);
  });

  it("returns all deals when amount range covers everything", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, amountMin: 0, amountMax: 999999 },
      NOW,
    );
    expect(result).toHaveLength(ALL_DEALS.length);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — owner filter
// ---------------------------------------------------------------------------

describe("applyDealFilters — owner filter", () => {
  it("returns only deals belonging to the specified ownerId", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, ownerId: "user-b" },
      NOW,
    );
    expect(result).toEqual([DEAL_OLD]);
  });

  it("returns empty array when no deal matches the ownerId", () => {
    const result = applyDealFilters(
      ALL_DEALS,
      { ...EMPTY_FILTERS, ownerId: "nonexistent-user" },
      NOW,
    );
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — combined (AND) filters
// ---------------------------------------------------------------------------

describe("applyDealFilters — combined filters (AND semantics)", () => {
  it("applies period + owner simultaneously", () => {
    const filters: DealFilters = {
      period: "30d",
      amountMin: null,
      amountMax: null,
      ownerId: "user-a",
    };
    const result = applyDealFilters(ALL_DEALS, filters, NOW);
    // DEAL_RECENT (3d, user-a) → in
    // DEAL_OLD (old, user-b) → out (period + owner)
    // DEAL_MEDIUM (20d, user-a) → in
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(DEAL_RECENT);
    expect(result).toContainEqual(DEAL_MEDIUM);
  });

  it("applies period + amount + owner simultaneously", () => {
    const filters: DealFilters = {
      period: "7d",
      amountMin: 5000,
      amountMax: 15000,
      ownerId: "user-a",
    };
    const result = applyDealFilters(ALL_DEALS, filters, NOW);
    // Only DEAL_RECENT matches all three (3d, 10000, user-a)
    expect(result).toEqual([DEAL_RECENT]);
  });

  it("returns empty array when combined filters match nothing", () => {
    const filters: DealFilters = {
      period: "7d",
      amountMin: null,
      amountMax: null,
      ownerId: "user-b", // user-b's only deal is old (outside 7d)
    };
    const result = applyDealFilters(ALL_DEALS, filters, NOW);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applyDealFilters — string createdAt (wire format compatibility)
// ---------------------------------------------------------------------------

describe("applyDealFilters — createdAt as ISO string", () => {
  it("handles string createdAt from tRPC wire format", () => {
    const stringDeal = makeDeal({
      // tRPC serialises Date as ISO string
      createdAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      amount: "5000",
      ownerId: "user-a",
    });
    const result = applyDealFilters(
      [stringDeal],
      { ...EMPTY_FILTERS, period: "7d" },
      NOW,
    );
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseFiltersFromUrl
// ---------------------------------------------------------------------------

describe("parseFiltersFromUrl", () => {
  it("returns EMPTY_FILTERS when no params are present", () => {
    const result = parseFiltersFromUrl(new URLSearchParams());
    expect(result).toEqual(EMPTY_FILTERS);
  });

  it("parses valid period", () => {
    const result = parseFiltersFromUrl(new URLSearchParams("period=30d"));
    expect(result.period).toBe("30d");
  });

  it("falls back to 'all' on invalid period value", () => {
    const result = parseFiltersFromUrl(new URLSearchParams("period=invalid"));
    expect(result.period).toBe("all");
  });

  it("parses valid amountMin and amountMax as numbers", () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams("amountMin=1000&amountMax=50000"),
    );
    expect(result.amountMin).toBe(1000);
    expect(result.amountMax).toBe(50000);
  });

  it("falls back to null on non-numeric amount values", () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams("amountMin=abc&amountMax=xyz"),
    );
    expect(result.amountMin).toBeNull();
    expect(result.amountMax).toBeNull();
  });

  it("falls back to null on negative amount (min=0 constraint)", () => {
    const result = parseFiltersFromUrl(new URLSearchParams("amountMin=-100"));
    expect(result.amountMin).toBeNull();
  });

  it("parses a valid UUID ownerId", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = parseFiltersFromUrl(
      new URLSearchParams(`ownerId=${uuid}`),
    );
    expect(result.ownerId).toBe(uuid);
  });

  it("falls back to null on non-UUID ownerId", () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams("ownerId=not-a-uuid"),
    );
    expect(result.ownerId).toBeNull();
  });

  it("parses a plain Record<string, string>", () => {
    const result = parseFiltersFromUrl({ period: "90d", amountMin: "2000" });
    expect(result.period).toBe("90d");
    expect(result.amountMin).toBe(2000);
  });

  it("picks first element of array values in a Record", () => {
    const result = parseFiltersFromUrl({ period: ["7d", "30d"] });
    expect(result.period).toBe("7d");
  });

  it("ignores unknown keys gracefully", () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams("period=7d&view=kanban&foo=bar"),
    );
    expect(result.period).toBe("7d");
    // No crash, unknown keys stripped
  });

  it("handles partial corruption: valid period + invalid amount", () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams("period=ytd&amountMin=nope"),
    );
    expect(result.period).toBe("ytd");
    expect(result.amountMin).toBeNull();
  });

  it("never throws on a fully corrupted URL: returns EMPTY_FILTERS", () => {
    // Mimics the exact scenario in the T1.5 Phase 5 brief:
    //   ?amountMin=abc&period=xyz&owner=nimportequoi
    // The `owner` key is intentionally wrong (we read `ownerId`), so it ends up
    // in the "unknown key" bucket. Every other key carries a value Zod rejects.
    // The function must NEVER throw — the page must render with default filters.
    expect(() =>
      parseFiltersFromUrl(
        new URLSearchParams(
          "amountMin=abc&amountMax=NaN&period=xyz&owner=nimportequoi&ownerId=not-a-uuid",
        ),
      ),
    ).not.toThrow();

    const result = parseFiltersFromUrl(
      new URLSearchParams(
        "amountMin=abc&amountMax=NaN&period=xyz&owner=nimportequoi&ownerId=not-a-uuid",
      ),
    );
    expect(result).toEqual(EMPTY_FILTERS);
  });
});

// ---------------------------------------------------------------------------
// serializeFiltersToUrl
// ---------------------------------------------------------------------------

describe("serializeFiltersToUrl", () => {
  it("returns empty record for EMPTY_FILTERS (clean URL)", () => {
    expect(serializeFiltersToUrl(EMPTY_FILTERS)).toEqual({});
  });

  it("omits 'all' period from the output", () => {
    const result = serializeFiltersToUrl({ ...EMPTY_FILTERS, period: "all" });
    expect("period" in result).toBe(false);
  });

  it("includes non-default period", () => {
    const result = serializeFiltersToUrl({ ...EMPTY_FILTERS, period: "30d" });
    expect(result.period).toBe("30d");
  });

  it("includes amountMin and amountMax when set", () => {
    const result = serializeFiltersToUrl({
      ...EMPTY_FILTERS,
      amountMin: 1000,
      amountMax: 50000,
    });
    expect(result.amountMin).toBe("1000");
    expect(result.amountMax).toBe("50000");
  });

  it("omits null amount values", () => {
    const result = serializeFiltersToUrl(EMPTY_FILTERS);
    expect("amountMin" in result).toBe(false);
    expect("amountMax" in result).toBe(false);
  });

  it("includes ownerId when set", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = serializeFiltersToUrl({ ...EMPTY_FILTERS, ownerId: uuid });
    expect(result.ownerId).toBe(uuid);
  });

  it("roundtrips through parseFiltersFromUrl correctly", () => {
    const original: DealFilters = {
      period: "30d",
      amountMin: 1500,
      amountMax: 75000,
      ownerId: "123e4567-e89b-12d3-a456-426614174000",
    };
    const serialized = serializeFiltersToUrl(original);
    const parsed = parseFiltersFromUrl(serialized);
    expect(parsed).toEqual(original);
  });

  it("roundtrips EMPTY_FILTERS cleanly (no params in URL)", () => {
    const serialized = serializeFiltersToUrl(EMPTY_FILTERS);
    const parsed = parseFiltersFromUrl(serialized);
    expect(parsed).toEqual(EMPTY_FILTERS);
  });
});
