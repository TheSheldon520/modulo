// apps/web/lib/import-mapping.test.ts
//
// Unit tests for the pure helpers in import-mapping.ts.
// All functions are synchronous and side-effect-free — no mocks required.

import { describe, it, expect } from "vitest";

import {
  DEAL_TARGET_FIELDS,
  UNMAPPED,
  normaliseForMatch,
  detectColumnMapping,
  applyMapping,
  isMappingComplete,
} from "./import-mapping";

// ---------------------------------------------------------------------------
// normaliseForMatch
// ---------------------------------------------------------------------------

describe("normaliseForMatch", () => {
  it("lowercases the input", () => {
    expect(normaliseForMatch("NAME")).toBe("name");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normaliseForMatch("  name  ")).toBe("name");
  });

  it("strips accent é", () => {
    expect(normaliseForMatch("Étape")).toBe("etape");
  });

  it("strips accent ê", () => {
    expect(normaliseForMatch("Intitulê")).toBe("intitule");
  });

  it("strips accent à", () => {
    expect(normaliseForMatch("Montànt")).toBe("montant");
  });

  it("strips accent ç", () => {
    expect(normaliseForMatch("Façade")).toBe("facade");
  });

  it("replaces underscores with a space", () => {
    expect(normaliseForMatch("contact_name")).toBe("contact name");
  });

  it("replaces hyphens with a space", () => {
    expect(normaliseForMatch("e-mail")).toBe("e mail");
  });

  it("collapses multiple spaces into one", () => {
    expect(normaliseForMatch("contact   email")).toBe("contact email");
  });

  it("handles an empty string", () => {
    expect(normaliseForMatch("")).toBe("");
  });

  it("handles a string with only whitespace", () => {
    expect(normaliseForMatch("   ")).toBe("");
  });

  it("handles trailing underscore after trim", () => {
    expect(normaliseForMatch("_name_")).toBe("name");
  });
});

// ---------------------------------------------------------------------------
// detectColumnMapping
// ---------------------------------------------------------------------------

describe("detectColumnMapping", () => {
  it("matches exact synonyms (clean ASCII)", () => {
    const headers = ["name", "amount", "stage"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.name).toBe("name");
    expect(mapping.amount).toBe("amount");
    expect(mapping.stage).toBe("stage");
    expect(mapping.contact_name).toBe(UNMAPPED);
    expect(mapping.contact_email).toBe(UNMAPPED);
  });

  it("is case-insensitive", () => {
    const headers = ["NAME", "AMOUNT", "STAGE"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.name).toBe("NAME");
    expect(mapping.amount).toBe("AMOUNT");
    expect(mapping.stage).toBe("STAGE");
  });

  it("matches French synonyms with accents", () => {
    const headers = ["Nom", "Montant", "Étape", "Contact email"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.name).toBe("Nom");
    expect(mapping.amount).toBe("Montant");
    expect(mapping.stage).toBe("Étape");
    expect(mapping.contact_email).toBe("Contact email");
  });

  it("matches synonym 'intitule' (no accent) for name", () => {
    const headers = ["intitule", "montant", "statut"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.name).toBe("intitule");
    expect(mapping.amount).toBe("montant");
    expect(mapping.stage).toBe("statut");
  });

  it("returns all UNMAPPED when headers are unrecognised", () => {
    const headers = ["Foo", "Bar", "Baz"];
    const mapping = detectColumnMapping(headers);
    expect(Object.values(mapping).every((v) => v === UNMAPPED)).toBe(true);
  });

  it("returns all UNMAPPED for an empty headers array", () => {
    const mapping = detectColumnMapping([]);
    expect(Object.values(mapping).every((v) => v === UNMAPPED)).toBe(true);
  });

  it("first occurrence wins when headers are duplicated", () => {
    const headers = ["Email", "email"];
    const mapping = detectColumnMapping(headers);
    // Both normalise to "email" which matches contact_email synonym "email".
    // The first header ("Email") should win.
    expect(mapping.contact_email).toBe("Email");
  });

  it("does not crash with duplicate headers", () => {
    const headers = ["Email", "email", "EMAIL"];
    expect(() => detectColumnMapping(headers)).not.toThrow();
  });

  it("uses the original (non-normalised) header string as the mapped value", () => {
    const headers = ["  Nom  "];
    const mapping = detectColumnMapping(headers);
    // The original string (with spaces) is preserved in the mapping value
    expect(mapping.name).toBe("  Nom  ");
  });

  it("matches contact_name synonym 'contact'", () => {
    const headers = ["name", "amount", "stage", "contact"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.contact_name).toBe("contact");
  });

  it("matches contact_email synonym 'mail'", () => {
    const headers = ["name", "amount", "stage", "mail"];
    const mapping = detectColumnMapping(headers);
    expect(mapping.contact_email).toBe("mail");
  });

  it("returns a mapping with exactly one key per target field", () => {
    const headers = ["Name", "Amount", "Stage", "Email"];
    const mapping = detectColumnMapping(headers);
    const keys = Object.keys(mapping);
    const targetKeys = DEAL_TARGET_FIELDS.map((f) => f.key);
    expect(keys.sort()).toEqual(targetKeys.sort());
  });
});

// ---------------------------------------------------------------------------
// applyMapping
// ---------------------------------------------------------------------------

describe("applyMapping", () => {
  it("produces draft rows with correct keys from a complete mapping", () => {
    const rows = [
      { Name: "Acme", Amount: "1000", Stage: "won", Email: "a@b.com" },
      { Name: "Beta", Amount: "2000", Stage: "lead", Email: "c@d.com" },
    ];
    const mapping = {
      name: "Name",
      amount: "Amount",
      stage: "Stage",
      contact_name: UNMAPPED,
      contact_email: "Email",
    };
    const result = applyMapping(rows, mapping);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "Acme",
      amount: "1000",
      stage: "won",
      contact_email: "a@b.com",
    });
    expect(result[1]).toEqual({
      name: "Beta",
      amount: "2000",
      stage: "lead",
      contact_email: "c@d.com",
    });
    // contact_name must be absent (not undefined — truly absent)
    expect("contact_name" in (result[0] ?? {})).toBe(false);
  });

  it("omits keys that are UNMAPPED (key absent, not undefined)", () => {
    const rows = [{ Name: "Acme", Amount: "1000", Stage: "lead" }];
    const mapping = {
      name: "Name",
      amount: "Amount",
      stage: "Stage",
      contact_name: UNMAPPED,
      contact_email: UNMAPPED,
    };
    const result = applyMapping(rows, mapping);
    expect("contact_name" in (result[0] ?? {})).toBe(false);
    expect("contact_email" in (result[0] ?? {})).toBe(false);
  });

  it("returns an empty array for empty rows input", () => {
    const mapping = {
      name: "Name",
      amount: "Amount",
      stage: "Stage",
      contact_name: UNMAPPED,
      contact_email: UNMAPPED,
    };
    expect(applyMapping([], mapping)).toEqual([]);
  });

  it("ignores file headers not referenced in the mapping", () => {
    const rows = [{ Name: "Acme", Amount: "1000", Stage: "lead", Foo: "bar" }];
    const mapping = {
      name: "Name",
      amount: "Amount",
      stage: "Stage",
      contact_name: UNMAPPED,
      contact_email: UNMAPPED,
    };
    const result = applyMapping(rows, mapping);
    // "Foo" should not appear in any draft row
    expect("Foo" in (result[0] ?? {})).toBe(false);
    expect(result[0]).toEqual({ name: "Acme", amount: "1000", stage: "lead" });
  });

  it("handles partial mapping (some UNMAPPED) correctly", () => {
    const rows = [{ Nom: "Acme", Montant: "500" }];
    const mapping = {
      name: "Nom",
      amount: "Montant",
      stage: UNMAPPED,
      contact_name: UNMAPPED,
      contact_email: UNMAPPED,
    };
    const result = applyMapping(rows, mapping);
    expect(result[0]).toEqual({ name: "Acme", amount: "500" });
    expect("stage" in (result[0] ?? {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isMappingComplete
// ---------------------------------------------------------------------------

describe("isMappingComplete", () => {
  const completeMapping = {
    name: "Name",
    amount: "Amount",
    stage: "Stage",
    contact_name: UNMAPPED,
    contact_email: UNMAPPED,
  };

  it("returns true when all required fields are mapped", () => {
    expect(isMappingComplete(completeMapping)).toBe(true);
  });

  it("returns true when optional fields are UNMAPPED but required are all mapped", () => {
    const mapping = { ...completeMapping, contact_name: UNMAPPED, contact_email: UNMAPPED };
    expect(isMappingComplete(mapping)).toBe(true);
  });

  it("returns false when a required field (name) is UNMAPPED", () => {
    const mapping = { ...completeMapping, name: UNMAPPED };
    expect(isMappingComplete(mapping)).toBe(false);
  });

  it("returns false when a required field (amount) is UNMAPPED", () => {
    const mapping = { ...completeMapping, amount: UNMAPPED };
    expect(isMappingComplete(mapping)).toBe(false);
  });

  it("returns false when a required field (stage) is UNMAPPED", () => {
    const mapping = { ...completeMapping, stage: UNMAPPED };
    expect(isMappingComplete(mapping)).toBe(false);
  });

  it("returns false when all fields are UNMAPPED", () => {
    const mapping: Record<string, string> = {
      name: UNMAPPED,
      amount: UNMAPPED,
      stage: UNMAPPED,
      contact_name: UNMAPPED,
      contact_email: UNMAPPED,
    };
    expect(isMappingComplete(mapping as ReturnType<typeof detectColumnMapping>)).toBe(false);
  });

  it("returns false when only 2 of 3 required fields are mapped", () => {
    const mapping = { ...completeMapping, stage: UNMAPPED };
    expect(isMappingComplete(mapping)).toBe(false);
  });
});
