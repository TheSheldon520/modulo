// modules/sales-analytics/__tests__/router-schemas.test.ts
//
// Zod-only contract tests for the schemas exported by the router. We assert
// the validation surface (what shape inputs must have to reach the procedure)
// without booting the tRPC caller — the procedures themselves are integration
// territory and are covered by higher-level tests once the DB harness lands.

import { describe, expect, it } from "vitest";

import {
  contactCreateSchema,
  dealCreateSchema,
  dealUpdateSchema,
  pipelineStageCreateSchema,
} from "../schemas";

const VALID_UUID = "01940000-0000-7000-8000-000000000000";

describe("dealCreateSchema", () => {
  it("accepts a well-formed deal payload", () => {
    const parsed = dealCreateSchema.parse({
      name: "Acme — annual contract",
      stage: "lead",
      amount: "12500.00",
      ownerId: VALID_UUID,
    });
    expect(parsed.name).toBe("Acme — annual contract");
    expect(parsed.stage).toBe("lead");
  });

  it("rejects an empty name", () => {
    expect(() =>
      dealCreateSchema.parse({
        name: "",
        stage: "lead",
        amount: "100.00",
        ownerId: VALID_UUID,
      }),
    ).toThrow();
  });

  it("rejects a negative or non-decimal amount", () => {
    expect(() =>
      dealCreateSchema.parse({
        name: "Bad amount",
        stage: "lead",
        amount: "-100.00",
        ownerId: VALID_UUID,
      }),
    ).toThrow();
    expect(() =>
      dealCreateSchema.parse({
        name: "Bad amount",
        stage: "lead",
        amount: "not-a-number",
        ownerId: VALID_UUID,
      }),
    ).toThrow();
  });

  it("rejects an unknown stage", () => {
    expect(() =>
      dealCreateSchema.parse({
        name: "Bad stage",
        stage: "Unknown",
        amount: "100.00",
        ownerId: VALID_UUID,
      }),
    ).toThrow();
  });
});

describe("dealUpdateSchema", () => {
  it("requires an id and accepts partial updates", () => {
    const parsed = dealUpdateSchema.parse({
      id: VALID_UUID,
      stage: "won",
    });
    expect(parsed.id).toBe(VALID_UUID);
    expect(parsed.stage).toBe("won");
    expect(parsed.name).toBeUndefined();
  });

  it("rejects an update missing the id", () => {
    expect(() =>
      dealUpdateSchema.parse({
        stage: "won",
      }),
    ).toThrow();
  });
});

describe("contactCreateSchema", () => {
  it("accepts a minimal payload (only name)", () => {
    const parsed = contactCreateSchema.parse({ name: "John Doe" });
    expect(parsed.name).toBe("John Doe");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      contactCreateSchema.parse({
        name: "John Doe",
        email: "not-an-email",
      }),
    ).toThrow();
  });
});

describe("pipelineStageCreateSchema", () => {
  it("rejects a colour that is not strict 6-char hex", () => {
    expect(() =>
      pipelineStageCreateSchema.parse({
        name: "Lead",
        position: 0,
        color: "rgb(255,0,0)",
      }),
    ).toThrow();
    expect(() =>
      pipelineStageCreateSchema.parse({
        name: "Lead",
        position: 0,
        color: "#abc",
      }),
    ).toThrow();
  });

  it("accepts a valid 6-char hex colour", () => {
    const parsed = pipelineStageCreateSchema.parse({
      name: "Lead",
      position: 0,
      color: "#aabbcc",
    });
    expect(parsed.color).toBe("#aabbcc");
  });
});
