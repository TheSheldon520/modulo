// apps/web/lib/onboarding-schemas.test.ts
//
// Identity translator → error messages collapse to their message key, which
// is stable and locale-agnostic for assertions.

import { describe, expect, it } from "vitest";

import { makeCreateOrgSchema } from "./onboarding-schemas";

const identity = (key: string) => key;

describe("makeCreateOrgSchema", () => {
  const schema = makeCreateOrgSchema(identity);

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
