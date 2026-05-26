// apps/web/lib/slugify.test.ts

import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("converts a regular company name to a hyphenated slug", () => {
    expect(slugify("Silverlit France SAS")).toBe("silverlit-france-sas");
  });

  it("strips diacritics and trims surrounding whitespace", () => {
    expect(slugify("  Café  ô  ")).toBe("cafe-o");
  });

  it("returns an empty string when the input has no alphanumerics", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("preserves digits and lowercases letters", () => {
    expect(slugify("ABC123")).toBe("abc123");
  });
});
