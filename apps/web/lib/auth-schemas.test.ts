// apps/web/lib/auth-schemas.test.ts
//
// Stub messages match the i18n key name (e.g. `invalidEmail: "errors.invalidEmail"`)
// so assertions stay locale-agnostic and compare exact strings — the same
// invariant the previous identity-translator stub provided, but with a typed
// object that matches the production call-site shape.

import { describe, expect, it } from "vitest";

import {
  makeLoginSchema,
  makeSignupSchema,
  type LoginSchemaMessages,
  type SignupSchemaMessages,
} from "./auth-schemas";

const loginMessages: LoginSchemaMessages = {
  invalidEmail: "errors.invalidEmail",
  passwordRequired: "errors.passwordRequired",
};

const signupMessages: SignupSchemaMessages = {
  nameRequired: "errors.nameRequired",
  invalidEmail: "errors.invalidEmail",
  passwordTooShort: "errors.passwordTooShort",
};

describe("makeLoginSchema", () => {
  const schema = makeLoginSchema(loginMessages);

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
  const schema = makeSignupSchema(signupMessages);

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
