// modules/sales-analytics/__tests__/period.test.ts
//
// Unit tests for the pure period-arithmetic helpers. No mocking of global time
// — each function receives an explicit `now: Date` so tests are deterministic.

import { describe, expect, it } from "vitest";

import {
  computeVariation,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
} from "../lib/period";

// Frozen reference timestamp: 2026-05-29 12:00:00 UTC (today in the seed).
const NOW = new Date("2026-05-29T12:00:00Z");

// ---------------------------------------------------------------------------
// resolvePeriodRange
// ---------------------------------------------------------------------------

describe("resolvePeriodRange", () => {
  it('returns [now-7d, now] for "7d"', () => {
    const { start, end } = resolvePeriodRange("7d", NOW);
    expect(end.getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it('returns [now-30d, now] for "30d"', () => {
    const { start, end } = resolvePeriodRange("30d", NOW);
    expect(end.getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it('returns [now-90d, now] for "90d"', () => {
    const { start, end } = resolvePeriodRange("90d", NOW);
    expect(end.getTime()).toBe(NOW.getTime());
    const expectedStart = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000);
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it('returns [Jan 1 UTC current year, now] for "ytd"', () => {
    const { start, end } = resolvePeriodRange("ytd", NOW);
    expect(end.getTime()).toBe(NOW.getTime());
    // Jan 1 2026 00:00:00 UTC
    const expectedStart = new Date(Date.UTC(2026, 0, 1));
    expect(start.getTime()).toBe(expectedStart.getTime());
  });
});

// ---------------------------------------------------------------------------
// resolvePreviousPeriodRange
// ---------------------------------------------------------------------------

describe("resolvePreviousPeriodRange", () => {
  it('returns the 7-day window immediately before the current 7d window', () => {
    const current = resolvePeriodRange("7d", NOW);
    const prev = resolvePreviousPeriodRange("7d", NOW);
    // previous end === current start
    expect(prev.end.getTime()).toBe(current.start.getTime());
    // duration is the same
    const currentDuration = current.end.getTime() - current.start.getTime();
    const prevDuration = prev.end.getTime() - prev.start.getTime();
    expect(prevDuration).toBe(currentDuration);
  });

  it('returns the 90-day window immediately before the current 90d window', () => {
    const current = resolvePeriodRange("90d", NOW);
    const prev = resolvePreviousPeriodRange("90d", NOW);
    expect(prev.end.getTime()).toBe(current.start.getTime());
    const duration = 90 * 24 * 60 * 60 * 1000;
    expect(prev.end.getTime() - prev.start.getTime()).toBe(duration);
  });

  it('returns [Jan 1 last year, same day last year] for "ytd"', () => {
    const prev = resolvePreviousPeriodRange("ytd", NOW);
    // start = Jan 1 2025 UTC
    expect(prev.start.getTime()).toBe(new Date(Date.UTC(2025, 0, 1)).getTime());
    // end = 2025-05-29 12:00:00 UTC (same month/day/time, year-1)
    expect(prev.end.getTime()).toBe(new Date("2025-05-29T12:00:00Z").getTime());
  });
});

// ---------------------------------------------------------------------------
// computeVariation
// ---------------------------------------------------------------------------

describe("computeVariation", () => {
  it("returns positive delta and percentage when current > previous", () => {
    const result = computeVariation(120, 100);
    expect(result.delta).toBe(20);
    expect(result.percentage).toBeCloseTo(20);
  });

  it("returns negative delta and percentage when current < previous", () => {
    const result = computeVariation(80, 100);
    expect(result.delta).toBe(-20);
    expect(result.percentage).toBeCloseTo(-20);
  });

  it("returns delta=0 and percentage=null when both are zero", () => {
    const result = computeVariation(0, 0);
    expect(result.delta).toBe(0);
    expect(result.percentage).toBeNull();
  });

  it("returns percentage=null (avoid ÷0) when previous is zero", () => {
    const result = computeVariation(50, 0);
    expect(result.delta).toBe(50);
    expect(result.percentage).toBeNull();
  });

  it("returns delta=-100 and percentage=-100 when current is zero", () => {
    const result = computeVariation(0, 100);
    expect(result.delta).toBe(-100);
    expect(result.percentage).toBeCloseTo(-100);
  });

  it("returns delta=0 and percentage=0 when current equals previous (non-zero)", () => {
    const result = computeVariation(75, 75);
    expect(result.delta).toBe(0);
    expect(result.percentage).toBeCloseTo(0);
  });
});
