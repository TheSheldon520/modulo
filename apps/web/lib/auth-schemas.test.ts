// apps/web/lib/auth-schemas.test.ts
//
// We pass an identity translator so error messages collapse to the message
// key — that's stable, locale-agnostic, and lets us assert on exact strings.

import { describe, expect, it } from "vitest";

import { makeLoginSchema, makeSignupSchema } from "./auth-schemas";

const identity = (key: string) => key;

describe("makeLoginSchema", () => {
  const schema = makeLoginSchema(identity);

  it("accepts a valid email + non-empty password", () => {
    const result = schema.safeParse({
      email: "alice@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = schema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.invalidEmail");
    }
  });

  it("rejects an empty password", () => {
    const result = schema.safeParse({
      email: "alice@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.passwordRequired");
    }
  });
});

describe("makeSignupSchema", () => {
  const schema = makeSignupSchema(identity);

  it("accepts a valid payload", () => {
    const result = schema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "longenough",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = schema.safeParse({
      name: "",
      email: "alice@example.com",
      password: "longenough",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.nameRequired");
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = schema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.passwordTooShort");
    }
  });

  it("rejects an invalid email", () => {
    const result = schema.safeParse({
      name: "Alice",
      email: "nope",
      password: "longenough",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.invalidEmail");
    }
  });
});
