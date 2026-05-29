// modules/sales-analytics/__tests__/closed-at.test.ts
//
// Unit tests for the resolveClosedAt helper.
// Pure node environment — no DOM, no Drizzle, no tRPC.

import { describe, expect, it } from "vitest";

import { resolveClosedAt } from "../lib/closed-at";

const FIXED_NOW = new Date("2026-05-29T12:00:00.000Z");
const EXISTING_DATE = new Date("2026-01-15T09:00:00.000Z");

describe("resolveClosedAt", () => {
  // -------------------------------------------------------------------------
  // Sentinel: no stage change
  // -------------------------------------------------------------------------

  it("returns undefined when newStage is undefined (no-op sentinel)", () => {
    expect(resolveClosedAt(null, undefined, FIXED_NOW)).toBeUndefined();
    expect(resolveClosedAt(EXISTING_DATE, undefined, FIXED_NOW)).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Open stages → clear closedAt
  // -------------------------------------------------------------------------

  it('returns null for "lead" (re-opening clears closedAt)', () => {
    expect(resolveClosedAt(EXISTING_DATE, "lead", FIXED_NOW)).toBeNull();
  });

  it('returns null for "qualified" regardless of existing closedAt', () => {
    expect(resolveClosedAt(EXISTING_DATE, "qualified", FIXED_NOW)).toBeNull();
    expect(resolveClosedAt(null, "qualified", FIXED_NOW)).toBeNull();
  });

  it('returns null for "proposal"', () => {
    expect(resolveClosedAt(EXISTING_DATE, "proposal", FIXED_NOW)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Closed stages → set closedAt (preserve existing, set if null)
  // -------------------------------------------------------------------------

  it('returns now for "won" when closedAt is null (first close)', () => {
    const result = resolveClosedAt(null, "won", FIXED_NOW);
    expect(result).toEqual(FIXED_NOW);
  });

  it('preserves existing closedAt for "won" when already set (S6)', () => {
    // Drag Won → Won (or elsewhere → Won on a deal already won): keep date
    const result = resolveClosedAt(EXISTING_DATE, "won", FIXED_NOW);
    expect(result).toEqual(EXISTING_DATE);
    // Must NOT overwrite with FIXED_NOW
    expect(result).not.toEqual(FIXED_NOW);
  });

  it('returns now for "lost" when closedAt is null', () => {
    const result = resolveClosedAt(null, "lost", FIXED_NOW);
    expect(result).toEqual(FIXED_NOW);
  });

  it('preserves existing closedAt for "lost" when already set (Won → Lost preserves original)', () => {
    // S6 core scenario: drag from Won → Lost keeps the original won date
    const result = resolveClosedAt(EXISTING_DATE, "lost", FIXED_NOW);
    expect(result).toEqual(EXISTING_DATE);
  });

  // -------------------------------------------------------------------------
  // Edge: explicit input.closedAt is handled by the caller, not here
  // (resolveClosedAt only controls the stage-driven auto-logic)
  // -------------------------------------------------------------------------

  it("uses the injected `now` clock for reproducible results", () => {
    const customNow = new Date("2026-03-01T00:00:00.000Z");
    const result = resolveClosedAt(null, "won", customNow);
    expect(result).toEqual(customNow);
  });
});
