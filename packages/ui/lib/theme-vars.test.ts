// packages/ui/lib/theme-vars.test.ts
//
// `generateThemeVars` is a pure projection — these tests pin the three cases
// that matter for the org layout: null → {}, empty map → {}, populated map →
// passthrough.

import { describe, expect, it } from "vitest";

import { generateThemeVars } from "./theme-vars";

describe("generateThemeVars", () => {
  it("returns an empty object when theme is null", () => {
    expect(generateThemeVars(null)).toEqual({});
  });

  it("returns an empty object when theme is an empty map", () => {
    expect(generateThemeVars({})).toEqual({});
  });

  it("forwards CSS variables as-is", () => {
    const theme = {
      "--accent": "oklch(0.7 0.18 142)",
      "--radius": "0.5rem",
    };
    expect(generateThemeVars(theme)).toEqual(theme);
  });
});
