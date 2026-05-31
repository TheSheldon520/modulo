// apps/web/lib/import-validate.test.ts
//
// Exhaustive unit tests for import-validate.ts (Phase 3 validation lib).
// All functions are pure and synchronous — no mocks required.

import { describe, it, expect } from "vitest";

import {
  parseAmount,
  resolveStageValue,
  validateImportRow,
  validateImportRows,
  STAGE_FR_LABELS,
} from "./import-validate";
import frMessages from "../messages/fr.json";

// ---------------------------------------------------------------------------
// parseAmount — ~15 tests
// ---------------------------------------------------------------------------

describe("parseAmount", () => {
  it("parses a regular-space FR number (45 000,50)", () => {
    expect(parseAmount("45 000,50")).toBe(45000.5);
  });

  it("parses a NBSP-separated FR number (45 000,50)", () => {
    // U+00A0 — most common in Excel FR exports
    expect(parseAmount("45 000,50")).toBe(45000.5);
  });

  it("parses a narrow-NBSP-separated number (1 234,56)", () => {
    // U+202F — used by some French locale formatters
    expect(parseAmount("1 234,56")).toBe(1234.56);
  });

  it("parses a thin-space-separated number (1 1000)", () => {
    // U+2009 — thin space
    expect(parseAmount("1 000")).toBe(1000);
  });

  it("parses a plain dot-decimal number (1234.56)", () => {
    expect(parseAmount("1234.56")).toBe(1234.56);
  });

  it("parses a comma-decimal number without thousands (1234,56)", () => {
    expect(parseAmount("1234,56")).toBe(1234.56);
  });

  it("parses zero (0)", () => {
    expect(parseAmount("0")).toBe(0);
  });

  it("parses zero with comma decimal (0,00)", () => {
    expect(parseAmount("0,00")).toBe(0);
  });

  it("returns null for a negative integer (-50)", () => {
    expect(parseAmount("-50")).toBeNull();
  });

  it("returns null for a negative decimal (-50,5)", () => {
    expect(parseAmount("-50,5")).toBeNull();
  });

  it("returns null for a non-numeric string (abc)", () => {
    expect(parseAmount("abc")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseAmount("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(parseAmount("   ")).toBeNull();
  });

  it("returns null for a mixed alphanumeric string (12abc)", () => {
    expect(parseAmount("12abc")).toBeNull();
  });

  it("returns null for a double-comma string (12,34,56 = two commas)", () => {
    // After comma→dot conversion: "12.34.56" → NaN
    expect(parseAmount("12,34,56")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveStageValue — ~15 tests
// ---------------------------------------------------------------------------

describe("resolveStageValue", () => {
  it("resolves lowercase 'lead' to 'lead'", () => {
    expect(resolveStageValue("lead")).toBe("lead");
  });

  it("resolves uppercase 'LEAD' to 'lead'", () => {
    expect(resolveStageValue("LEAD")).toBe("lead");
  });

  it("resolves mixed-case 'Lead' to 'lead'", () => {
    expect(resolveStageValue("Lead")).toBe("lead");
  });

  it("resolves ' lead ' (with surrounding spaces) to 'lead'", () => {
    expect(resolveStageValue(" lead ")).toBe("lead");
  });

  it("resolves FR label 'Qualifié' (with accent) to 'qualified'", () => {
    expect(resolveStageValue("Qualifié")).toBe("qualified");
  });

  it("resolves 'qualifie' (accent stripped) to 'qualified'", () => {
    expect(resolveStageValue("qualifie")).toBe("qualified");
  });

  it("resolves 'QUALIFIE' (upper + no accent) to 'qualified'", () => {
    expect(resolveStageValue("QUALIFIE")).toBe("qualified");
  });

  it("resolves FR label 'Proposition' to 'proposal'", () => {
    expect(resolveStageValue("Proposition")).toBe("proposal");
  });

  it("resolves FR label 'Gagné' (with accent) to 'won'", () => {
    expect(resolveStageValue("Gagné")).toBe("won");
  });

  it("resolves 'gagne' (accent stripped) to 'won'", () => {
    expect(resolveStageValue("gagne")).toBe("won");
  });

  it("resolves lowercase 'perdu' to 'lost'", () => {
    expect(resolveStageValue("perdu")).toBe("lost");
  });

  it("resolves mixed-case 'Perdu' to 'lost'", () => {
    expect(resolveStageValue("Perdu")).toBe("lost");
  });

  it("returns null for an unknown value 'unknown'", () => {
    expect(resolveStageValue("unknown")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveStageValue("")).toBeNull();
  });

  it("returns null for an incomplete value 'qualifi'", () => {
    expect(resolveStageValue("qualifi")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateImportRow — ~11 tests
// ---------------------------------------------------------------------------

describe("validateImportRow", () => {
  const validDraft = {
    name: "Acme Corp",
    amount: "45000",
    stage: "lead",
    contact_name: "Alice",
    contact_email: "alice@acme.com",
  };

  it("happy path: all fields valid → valid: true with correct parsed values", () => {
    const result = validateImportRow(validDraft, 0);
    expect(result.valid).toBe(true);
    expect(result.index).toBe(0);
    expect(result.errors).toEqual({});
    expect(result.parsed).toMatchObject({
      name: "Acme Corp",
      amount: 45000,
      stage: "lead",
      contactName: "Alice",
      contactEmail: "alice@acme.com",
    });
  });

  it("empty name → NAME_REQUIRED error", () => {
    const result = validateImportRow({ ...validDraft, name: "" }, 1);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("NAME_REQUIRED");
  });

  it("missing amount key → AMOUNT_REQUIRED error", () => {
    const { amount: _, ...draftWithoutAmount } = validDraft;
    const result = validateImportRow(draftWithoutAmount, 2);
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBe("AMOUNT_REQUIRED");
  });

  it("negative amount → AMOUNT_NEGATIVE error", () => {
    const result = validateImportRow({ ...validDraft, amount: "-100" }, 3);
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBe("AMOUNT_NEGATIVE");
  });

  it("non-numeric amount → AMOUNT_INVALID error", () => {
    const result = validateImportRow({ ...validDraft, amount: "abc" }, 4);
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBe("AMOUNT_INVALID");
  });

  it("missing stage key → STAGE_REQUIRED error", () => {
    const { stage: _, ...draftWithoutStage } = validDraft;
    const result = validateImportRow(draftWithoutStage, 5);
    expect(result.valid).toBe(false);
    expect(result.errors.stage).toBe("STAGE_REQUIRED");
  });

  it("unknown stage value → STAGE_INVALID error", () => {
    const result = validateImportRow({ ...validDraft, stage: "unknown" }, 6);
    expect(result.valid).toBe(false);
    expect(result.errors.stage).toBe("STAGE_INVALID");
  });

  it("malformed email → EMAIL_INVALID error", () => {
    const result = validateImportRow(
      { ...validDraft, contact_email: "pas-un-email" },
      7,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.contact_email).toBe("EMAIL_INVALID");
  });

  it("absent contact_email → no error, parsed.contactEmail = null", () => {
    const { contact_email: _, ...draftNoEmail } = validDraft;
    const result = validateImportRow(draftNoEmail, 8);
    expect(result.valid).toBe(true);
    expect(result.parsed?.contactEmail).toBeNull();
  });

  it("absent contact_name → no error, parsed.contactName = null", () => {
    const { contact_name: _, ...draftNoContact } = validDraft;
    const result = validateImportRow(draftNoContact, 9);
    expect(result.valid).toBe(true);
    expect(result.parsed?.contactName).toBeNull();
  });

  it("two simultaneous errors (empty name + unknown stage) → both codes in errors", () => {
    const result = validateImportRow(
      { ...validDraft, name: "", stage: "wat" },
      10,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("NAME_REQUIRED");
    expect(result.errors.stage).toBe("STAGE_INVALID");
  });
});

// ---------------------------------------------------------------------------
// validateImportRows — ~3 tests
// ---------------------------------------------------------------------------

describe("validateImportRows", () => {
  const validDraft = {
    name: "Acme Corp",
    amount: "1000",
    stage: "lead",
  };
  const invalidDraft = {
    name: "",
    amount: "bad",
    stage: "unknown",
  };

  it("3 valid rows → validCount=3, errorCount=0", () => {
    const summary = validateImportRows([validDraft, validDraft, validDraft]);
    expect(summary.validCount).toBe(3);
    expect(summary.errorCount).toBe(0);
    expect(summary.rows).toHaveLength(3);
  });

  it("2 valid + 1 invalid → validCount=2, errorCount=1", () => {
    const summary = validateImportRows([validDraft, invalidDraft, validDraft]);
    expect(summary.validCount).toBe(2);
    expect(summary.errorCount).toBe(1);
    expect(summary.rows[1]?.valid).toBe(false);
  });

  it("0 rows → validCount=0, errorCount=0", () => {
    const summary = validateImportRows([]);
    expect(summary.validCount).toBe(0);
    expect(summary.errorCount).toBe(0);
    expect(summary.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// STAGE_FR_LABELS isomorphism with fr.json — 1 test
// ---------------------------------------------------------------------------

describe("STAGE_FR_LABELS isomorphism with fr.json", () => {
  it("each stage label in STAGE_FR_LABELS matches the corresponding label in fr.json", () => {
    const stagesI18n = frMessages.modules.salesAnalytics.deals.stages;

    for (const [id, label] of Object.entries(STAGE_FR_LABELS)) {
      const key = id as keyof typeof stagesI18n;
      expect(stagesI18n[key]).toBe(label);
    }
  });
});
