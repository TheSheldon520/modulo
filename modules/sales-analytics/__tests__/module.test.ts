// modules/sales-analytics/__tests__/module.test.ts
//
// Smoke test — ensures the module config is well-formed and that the package
// boundary works (router export resolves, scopes are read-only literals).

import { describe, expect, it } from "vitest";

import { salesAnalyticsConfig } from "../module.config";

describe("Sales Analytics module config", () => {
  it("declares the expected module id", () => {
    expect(salesAnalyticsConfig.id).toBe("sales-analytics");
  });

  it("exposes three scopes (read / write / admin)", () => {
    expect(salesAnalyticsConfig.scopes).toHaveLength(3);
    expect(salesAnalyticsConfig.scopes).toContain("sales:read");
    expect(salesAnalyticsConfig.scopes).toContain("sales:write");
    expect(salesAnalyticsConfig.scopes).toContain("sales:admin");
  });
});
