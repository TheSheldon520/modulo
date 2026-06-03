// apps/web/lib/onboarding-schemas.test.ts
//
// Stub messages match the i18n key name (e.g. `nameRequired: "errors.nameRequired"`)
// so assertions stay locale-agnostic and compare exact strings — the same
// invariant the previous identity-translator stub provided, but with a typed
// object that matches the production call-site shape.

import { describe, expect, it } from "vitest";

import {
  makeCreateOrgSchema,
  type CreateOrgSchemaMessages,
} from "./onboarding-schemas";

const messages: CreateOrgSchemaMessages = {
  nameRequired: "errors.nameRequired",
  nameTooLong: "errors.nameTooLong",
  slugTooShort: "errors.slugTooShort",
  slugTooLong: "errors.slugTooLong",
  slugFormat: "errors.slugFormat",
};

describe("makeCreateOrgSchema", () => {
  const schema = makeCreateOrgSchema(messages);

  it("accepts a valid name + slug", () => {
    const result = schema.safeParse({
      name: "Silverlit France SAS",
      slug: "silverlit-france-sas",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = schema.safeParse({ name: "", slug: "valid-slug" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.nameRequired");
    }
  });

  it("rejects a slug shorter than 3 characters", () => {
    const result = schema.safeParse({ name: "Acme", slug: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("errors.slugTooShort");
    }
  });

  it("rejects a slug with forbidden characters", () => {
    const result = schema.safeParse({ name: "Acme", slug: "Foo Bar" });
    expect(result.success).toBe(false);
    if (!result.success) {
      // "Foo Bar" is long enough → only the regex check fires.
      expect(result.error.issues[0]?.message).toBe("errors.slugFormat");
    }
  });
});
