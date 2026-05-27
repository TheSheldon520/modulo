// packages/api/src/modules/registry.test.ts
//
// Unit tests for the static module registry. The registry exposes
// `stripePriceId` as a lazy getter backed by `requireEnv`, so any test that
// reads it must scope the env var locally. We set it in `beforeAll` /
// restore in `afterAll` to keep the suite hermetic — the global
// `test-setup.ts` was removed in T0.10 (lazy `getAuth()` refactor) and we
// no longer ship inert env defaults at the suite level.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getModule, listAvailableModules, MODULES } from "./registry";

const STRIPE_PRICE_KEY = "STRIPE_PRICE_SALES_ANALYTICS";

describe("module registry", () => {
  let previousStripePrice: string | undefined;

  beforeAll(() => {
    previousStripePrice = process.env[STRIPE_PRICE_KEY];
    process.env[STRIPE_PRICE_KEY] = "price_test_sales_analytics";
  });

  afterAll(() => {
    if (previousStripePrice === undefined) {
      delete process.env[STRIPE_PRICE_KEY];
    } else {
      process.env[STRIPE_PRICE_KEY] = previousStripePrice;
    }
  });

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
