// modules/sales-analytics/__tests__/period-presets.test.ts
//
// Unit tests for the period-presets pure helpers. No mocking of global time —
// each function receives an explicit `now: Date` parameter so tests are
// deterministic (T1.4 pattern from period.test.ts).

import { describe, expect, it } from "vitest";

import {
  PERIOD_PRESETS,
  matchesPeriodPreset,
  periodPresetSchema,
  type PeriodPreset,
} from "../lib/period-presets";

// Frozen reference timestamp: 2026-05-29 12:00:00 UTC
const NOW = new Date("2026-05-29T12:00:00Z");

// ---------------------------------------------------------------------------
// PERIOD_PRESETS constant shape
// ---------------------------------------------------------------------------

describe("PERIOD_PRESETS", () => {
  it("contains exactly 5 presets in order", () => {
    const ids = PERIOD_PRESETS.map((p) => p.id);
    expect(ids).toEqual(["all", "7d", "30d", "90d", "ytd"]);
  });

  it("label equals id for every preset (i18n key convention)", () => {
    for (const preset of PERIOD_PRESETS) {
      expect(preset.label).toBe(preset.id);
    }
  });
});

// ---------------------------------------------------------------------------
// periodPresetSchema
// ---------------------------------------------------------------------------

describe("periodPresetSchema", () => {
  it.each(["all", "7d", "30d", "90d", "ytd"] satisfies PeriodPreset[])(
    'accepts "%s"',
    (value) => {
      expect(periodPresetSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects unknown values", () => {
    expect(periodPresetSchema.safeParse("1y").success).toBe(false);
    expect(periodPresetSchema.safeParse("").success).toBe(false);
    expect(periodPresetSchema.safeParse(null).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesPeriodPreset — "all"
// ---------------------------------------------------------------------------

describe('matchesPeriodPreset — "all"', () => {
  it("returns true for any date when preset is all", () => {
    const veryOld = new Date("2000-01-01T00:00:00Z");
    const future = new Date("2099-12-31T23:59:59Z");
    expect(matchesPeriodPreset(veryOld, "all", NOW)).toBe(true);
    expect(matchesPeriodPreset(future, "all", NOW)).toBe(true);
    expect(matchesPeriodPreset(NOW, "all", NOW)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesPeriodPreset — rolling windows
// ---------------------------------------------------------------------------

describe('matchesPeriodPreset — "7d"', () => {
  it("returns true for a date within the last 7 days", () => {
    const insideWindow = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000); // 3d ago
    expect(matchesPeriodPreset(insideWindow, "7d", NOW)).toBe(true);
  });

  it("returns true for the boundary (now - 7d exactly)", () => {
    const boundary = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(matchesPeriodPreset(boundary, "7d", NOW)).toBe(true);
  });

  it("returns false for a date just outside the 7d window", () => {
    const outsideWindow = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 1);
    expect(matchesPeriodPreset(outsideWindow, "7d", NOW)).toBe(false);
  });

  it("returns false for a date far in the past", () => {
    const old = new Date("2020-01-01T00:00:00Z");
    expect(matchesPeriodPreset(old, "7d", NOW)).toBe(false);
  });
});

describe('matchesPeriodPreset — "30d"', () => {
  it("returns true for a date 15 days ago", () => {
    const inside = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(matchesPeriodPreset(inside, "30d", NOW)).toBe(true);
  });

  it("returns false for a date 31 days ago", () => {
    const outside = new Date(NOW.getTime() - 31 * 24 * 60 * 60 * 1000);
    expect(matchesPeriodPreset(outside, "30d", NOW)).toBe(false);
  });
});

describe('matchesPeriodPreset — "90d"', () => {
  it("returns true for a date 45 days ago", () => {
    const inside = new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000);
    expect(matchesPeriodPreset(inside, "90d", NOW)).toBe(true);
  });

  it("returns false for a date 91 days ago", () => {
    const outside = new Date(NOW.getTime() - 91 * 24 * 60 * 60 * 1000);
    expect(matchesPeriodPreset(outside, "90d", NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesPeriodPreset — "ytd"
// ---------------------------------------------------------------------------

describe('matchesPeriodPreset — "ytd"', () => {
  it("returns true for Jan 1 of the current year", () => {
    const jan1 = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01 00:00:00 UTC
    expect(matchesPeriodPreset(jan1, "ytd", NOW)).toBe(true);
  });

  it("returns true for a date in mid-March of the current year", () => {
    const midMarch = new Date("2026-03-15T10:00:00Z");
    expect(matchesPeriodPreset(midMarch, "ytd", NOW)).toBe(true);
  });

  it("returns false for Dec 31 of the previous year", () => {
    const lastYear = new Date("2025-12-31T23:59:59Z");
    expect(matchesPeriodPreset(lastYear, "ytd", NOW)).toBe(false);
  });

  it("returns false for a date in the previous year", () => {
    const prevYear = new Date("2025-05-01T00:00:00Z");
    expect(matchesPeriodPreset(prevYear, "ytd", NOW)).toBe(false);
  });
});
