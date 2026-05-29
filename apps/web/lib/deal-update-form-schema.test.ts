// apps/web/lib/deal-update-form-schema.test.ts
//
// Unit tests for the makeDealUpdateFormSchema factory.
// Pure node environment — no DOM, no jsdom.
// The factory is called with an identity-stub t() so validation messages
// are the raw i18n key (predictable in tests, no locale loading required).

import { describe, expect, it } from "vitest";

import { makeDealUpdateFormSchema } from "./deal-update-form-schema";

// Identity stub: returns the key as-is so we can test the exact key used
const t = (key: string) => key;
const schema = makeDealUpdateFormSchema(t);

// ---------------------------------------------------------------------------
// name
// ---------------------------------------------------------------------------

describe("name field", () => {
  it("accepts a valid non-empty name", () => {
    const result = schema.safeParse({ name: "Renouvellement Picwic 2026", amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = schema.safeParse({ name: "", amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("sidePanel.errors.nameRequired");
    }
  });

  it("rejects a name longer than 200 characters", () => {
    const result = schema.safeParse({ name: "a".repeat(201), amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("sidePanel.errors.nameTooLong");
    }
  });

  it("trims leading/trailing whitespace and still validates", () => {
    const result = schema.safeParse({ name: "  Contrat  ", amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Contrat");
    }
  });

  it("rejects whitespace-only name after trim", () => {
    const result = schema.safeParse({ name: "   ", amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// amount
// ---------------------------------------------------------------------------

describe("amount field", () => {
  it("accepts an integer amount string", () => {
    const result = schema.safeParse({ name: "Test", amount: "1500", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a decimal amount string with 1 decimal place", () => {
    const result = schema.safeParse({ name: "Test", amount: "1500.5", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a decimal amount string with 2 decimal places", () => {
    const result = schema.safeParse({ name: "Test", amount: "1500.50", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative amount", () => {
    const result = schema.safeParse({ name: "Test", amount: "-100", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("sidePanel.errors.amountInvalid");
    }
  });

  it("rejects more than 2 decimal places", () => {
    const result = schema.safeParse({ name: "Test", amount: "1500.123", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    const result = schema.safeParse({ name: "Test", amount: "abc", stage: "lead", contactId: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stage
// ---------------------------------------------------------------------------

describe("stage field", () => {
  it("accepts all valid stage codes", () => {
    for (const stage of ["lead", "qualified", "proposal", "won", "lost"] as const) {
      const result = schema.safeParse({ name: "Test", amount: "0", stage, contactId: "" });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown stage code", () => {
    const result = schema.safeParse({ name: "Test", amount: "0", stage: "pipeline", contactId: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// contactId
// ---------------------------------------------------------------------------

describe("contactId field", () => {
  it("accepts an empty string (no contact)", () => {
    const result = schema.safeParse({ name: "Test", amount: "0", stage: "lead", contactId: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactId).toBe("");
    }
  });

  it("accepts a non-empty UUID string (contact selected)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = schema.safeParse({ name: "Test", amount: "0", stage: "lead", contactId: uuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactId).toBe(uuid);
    }
  });
});
