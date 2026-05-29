// apps/web/lib/owner-avatar.test.ts
//
// Unit tests for getOwnerInitials. Pure node environment — no DOM.

import { describe, expect, it } from "vitest";

import { getOwnerInitials } from "./owner-avatar";

describe("getOwnerInitials", () => {
  it('returns "CK" for "Chris Kapro"', () => {
    expect(getOwnerInitials("Chris Kapro")).toBe("CK");
  });

  it('returns "SM" for "Sophie Martin"', () => {
    expect(getOwnerInitials("Sophie Martin")).toBe("SM");
  });

  it('returns "C" for a single-word name', () => {
    expect(getOwnerInitials("Chris")).toBe("C");
  });

  it('returns "?" for an empty string', () => {
    expect(getOwnerInitials("")).toBe("?");
  });

  it('returns "?" for null', () => {
    expect(getOwnerInitials(null)).toBe("?");
  });

  it('returns "?" for undefined', () => {
    expect(getOwnerInitials(undefined)).toBe("?");
  });

  it('returns "JB" for "  jean-pierre  bourbon  " (trims + splits on whitespace)', () => {
    expect(getOwnerInitials("  jean-pierre  bourbon  ")).toBe("JB");
  });

  it('uses first + last word for multi-word names ("Alice Van Der Berg" → "AB")', () => {
    expect(getOwnerInitials("Alice Van Der Berg")).toBe("AB");
  });

  it('returns "?" for a whitespace-only string', () => {
    expect(getOwnerInitials("   ")).toBe("?");
  });
});
