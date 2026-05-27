// packages/api/src/modules/registry.test.ts
//
// Unit tests for the static module registry. `STRIPE_PRICE_SALES_ANALYTICS`
// is set by `test-setup.ts` before this file is imported — the registry calls
// `requireEnv` at module load, so the var must be defined globally for the
// suite to even start.

import { describe, expect, it } from "vitest";

import { getModule, listAvailableModules, MODULES } from "./registry";

describe("module registry", () => {
  it("looks up an existing slug", () => {
    const mod = getModule("sales-analytics");
    expect(mod).toBeDefined();
    expect(mod?.name).toBe("Sales Analytics");
    expect(mod?.status).toBe("available");
    expect(mod?.stripePriceId).toBeTruthy();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getModule("does-not-exist")).toBeUndefined();
  });

  it("lists every registered module", () => {
    const list = listAvailableModules();
    expect(list).toHaveLength(2);
    const slugs = list.map((m) => m.slug).sort();
    expect(slugs).toEqual(["crm", "sales-analytics"]);
  });

  it("flags CRM as coming_soon with no Stripe price", () => {
    const comingSoon = listAvailableModules().filter(
      (m) => m.status === "coming_soon",
    );
    expect(comingSoon).toHaveLength(1);
    expect(comingSoon[0]?.slug).toBe("crm");
    expect(MODULES.crm.stripePriceId).toBeNull();
  });
});
