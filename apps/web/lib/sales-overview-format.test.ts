// apps/web/lib/sales-overview-format.test.ts
//
// Unit tests for sales overview pure formatters. No DOM, no jsdom.

import { describe, expect, it } from "vitest";

import {
  formatConversionRate,
  formatMonthLabel,
  formatRevenueCompact,
  hasMeaningfulVariation,
  getStageDonutColor,
} from "./sales-overview-format";

describe("formatRevenueCompact", () => {
  it("formats zero as a compact euro string", () => {
    const result = formatRevenueCompact(0);
    expect(result).toMatch(/€/);
    expect(result).toMatch(/0/);
  });

  it("formats thousands with k suffix", () => {
    const result = formatRevenueCompact(204000);
    // fr-FR compact notation: "204 k€" — suffix may vary between Node versions
    expect(result).toContain("204");
    expect(result).toMatch(/k|K/i);
    expect(result).toContain("€");
  });

  it("formats millions with M suffix", () => {
    const result = formatRevenueCompact(1_500_000);
    expect(result).toMatch(/M/);
    expect(result).toContain("€");
  });

  it("formats small amounts without compact suffix", () => {
    const result = formatRevenueCompact(500);
    expect(result).toContain("500");
    expect(result).toContain("€");
  });
});

describe("getStageDonutColor", () => {
  it("returns info color for lead", () => {
    expect(getStageDonutColor("lead")).toBe("var(--color-info)");
  });

  it("returns success color for won", () => {
    expect(getStageDonutColor("won")).toBe("var(--color-success)");
  });

  it("returns danger color for lost", () => {
    expect(getStageDonutColor("lost")).toBe("var(--color-danger)");
  });

  it("returns warning color for proposal", () => {
    expect(getStageDonutColor("proposal")).toBe("var(--color-warning)");
  });

  it("returns text-tertiary color for qualified", () => {
    expect(getStageDonutColor("qualified")).toBe("var(--color-text-tertiary)");
  });

  it("returns fallback color for unknown stage", () => {
    expect(getStageDonutColor("future-stage")).toBe("var(--color-surface-3)");
  });
});

describe("formatMonthLabel", () => {
  it('formats "2026-01" as short French month', () => {
    const result = formatMonthLabel("2026-01");
    // fr-FR: "janv. 2026" — exact string may differ by Node version but must
    // contain "2026" and start with "jan" (case-insensitive)
    expect(result).toContain("2026");
    expect(result.toLowerCase()).toContain("jan");
  });

  it('formats "2025-12" as December', () => {
    const result = formatMonthLabel("2025-12");
    expect(result).toContain("2025");
    expect(result.toLowerCase()).toMatch(/d[eé]c/);
  });

  it("returns the raw string on malformed input (defensive)", () => {
    const result = formatMonthLabel("not-a-date");
    expect(result).toBe("not-a-date");
  });
});

describe("formatConversionRate", () => {
  it("formats 66.666 as 66.7 %", () => {
    const result = formatConversionRate(66.666);
    expect(result).toBe("66.7 %");
  });

  it("formats 0 as 0.0 %", () => {
    expect(formatConversionRate(0)).toBe("0.0 %");
  });

  it("formats 100 as 100.0 %", () => {
    expect(formatConversionRate(100)).toBe("100.0 %");
  });
});

describe("hasMeaningfulVariation", () => {
  it("returns false for an empty series", () => {
    expect(hasMeaningfulVariation([])).toBe(false);
  });

  it("returns false for a single point", () => {
    expect(hasMeaningfulVariation([{ x: "2026-01-05", y: 42 }])).toBe(false);
  });

  it("returns false when all points share the same y value", () => {
    expect(
      hasMeaningfulVariation([
        { x: "2026-03-02", y: 1 },
        { x: "2026-04-20", y: 1 },
      ]),
    ).toBe(false);
  });

  it("returns false for a long flat series", () => {
    expect(
      hasMeaningfulVariation([
        { x: "w1", y: 0 },
        { x: "w2", y: 0 },
        { x: "w3", y: 0 },
        { x: "w4", y: 0 },
      ]),
    ).toBe(false);
  });

  it("returns true when at least one point differs", () => {
    expect(
      hasMeaningfulVariation([
        { x: "2026-03-02", y: 41000 },
        { x: "2026-04-20", y: 23000 },
      ]),
    ).toBe(true);
  });

  it("returns true even if only the last point breaks the flat line", () => {
    expect(
      hasMeaningfulVariation([
        { x: "w1", y: 1 },
        { x: "w2", y: 1 },
        { x: "w3", y: 2 },
      ]),
    ).toBe(true);
  });
});
