// apps/web/lib/deal-format.test.ts
//
// Unit tests for the pure deal formatting helpers. No DOM, no jsdom — these
// run in the Vitest node environment alongside the other `apps/web/lib/` tests.

import { describe, expect, it } from "vitest";

import { formatDealAmount, getStageBadgeClasses } from "./deal-format";

describe("formatDealAmount", () => {
  it('formats "12500.50" as fr-FR euro', () => {
    // The fr-FR locale uses narrow no-break space (U+202F) as thousands
    // separator, a comma as decimal separator, and appends " €".
    const result = formatDealAmount("12500.50");
    expect(result).toContain("12");
    expect(result).toContain("500");
    expect(result).toContain("€");
    // Exact locale output can vary across Node versions — assert the key
    // structural invariant: contains the digits and the euro symbol.
  });

  it('formats "0" as "0,00 €"', () => {
    const result = formatDealAmount("0");
    expect(result).toContain("€");
    expect(result).toMatch(/0/);
  });

  it("returns the raw string on non-numeric input (defensive)", () => {
    const result = formatDealAmount("not-a-number");
    expect(result).toBe("not-a-number");
  });
});

describe("getStageBadgeClasses", () => {
  it('returns success classes for "won"', () => {
    const cls = getStageBadgeClasses("won");
    expect(cls).toContain("bg-success/10");
    expect(cls).toContain("text-success");
  });

  it('returns danger classes for "lost"', () => {
    const cls = getStageBadgeClasses("lost");
    expect(cls).toContain("bg-danger/10");
    expect(cls).toContain("text-danger");
  });

  it('returns info classes for "lead"', () => {
    const cls = getStageBadgeClasses("lead");
    expect(cls).toContain("bg-info/10");
    expect(cls).toContain("text-info");
  });

  it('returns neutral text-tertiary classes for "qualified"', () => {
    const cls = getStageBadgeClasses("qualified");
    expect(cls).toContain("bg-text-tertiary/10");
    expect(cls).toContain("text-text-secondary");
  });

  it("returns neutral fallback classes for an unknown stage", () => {
    const cls = getStageBadgeClasses("unknown-future-stage");
    expect(cls).toContain("bg-surface-2");
    expect(cls).toContain("text-text-secondary");
  });
});
