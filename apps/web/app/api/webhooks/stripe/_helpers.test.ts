// apps/web/app/api/webhooks/stripe/_helpers.test.ts
//
// Unit tests for `mapStripeStatusToModuleStatus`. Pure function — no DB, no
// network, no env vars needed. Each Stripe status maps to exactly one
// ModuleStatus; we test all 8 statuses defined in Stripe.Subscription.Status.

import { describe, expect, it } from "vitest";

import { mapStripeStatusToModuleStatus } from "./_helpers";

describe("mapStripeStatusToModuleStatus", () => {
  it("maps 'trialing' to 'trial'", () => {
    expect(mapStripeStatusToModuleStatus("trialing")).toBe("trial");
  });

  it("maps 'active' to 'active'", () => {
    expect(mapStripeStatusToModuleStatus("active")).toBe("active");
  });

  it("maps 'past_due' to 'past_due'", () => {
    expect(mapStripeStatusToModuleStatus("past_due")).toBe("past_due");
  });

  it("maps 'canceled' to 'canceled'", () => {
    expect(mapStripeStatusToModuleStatus("canceled")).toBe("canceled");
  });

  it("maps 'unpaid' to 'canceled'", () => {
    expect(mapStripeStatusToModuleStatus("unpaid")).toBe("canceled");
  });

  it("maps 'incomplete_expired' to 'canceled'", () => {
    expect(mapStripeStatusToModuleStatus("incomplete_expired")).toBe("canceled");
  });

  it("maps 'paused' to 'canceled'", () => {
    expect(mapStripeStatusToModuleStatus("paused")).toBe("canceled");
  });

  it("maps 'incomplete' to 'canceled'", () => {
    expect(mapStripeStatusToModuleStatus("incomplete")).toBe("canceled");
  });
});
