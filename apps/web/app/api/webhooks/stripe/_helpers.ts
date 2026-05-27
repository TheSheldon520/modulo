// apps/web/app/api/webhooks/stripe/_helpers.ts
//
// Pure helpers shared across the Stripe webhook handler. Kept colocated here
// because the webhook route is the only consumer today (YAGNI). If a tRPC
// procedure needs to backfill statuses in Phase 1, move this file to
// packages/api/src/billing/ and re-export it from there.

import type Stripe from "stripe";

import type { ModuleStatus } from "@modulo/db/schema";

/**
 * Maps a Stripe subscription status to the internal `module_status` enum.
 *
 * We use `Stripe.Subscription.Status` directly (the SDK union) rather than a
 * hand-rolled type alias so that SDK upgrades that add new statuses surface as
 * a TypeScript error here (the `default` branch becomes reachable from the
 * compiler's point of view, but our exhaustive-by-construction approach means
 * every *known* status is handled explicitly and unknowns fall to the
 * `default` which maps to "canceled" — the safe, access-revoking fallback).
 *
 * The `default` is intentionally not a compile-time error: Stripe is an
 * external system and may introduce statuses before we update the SDK. At
 * runtime, an unknown status should still revoke access (canceled) rather
 * than silently leaving the module active.
 */
export function mapStripeStatusToModuleStatus(
  status: Stripe.Subscription.Status,
): ModuleStatus {
  switch (status) {
    case "trialing":
      return "trial";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
    case "incomplete":
      return "canceled";
    default: {
      // Runtime safety net for future Stripe statuses not yet in the SDK.
      // Treat unknown statuses as access-revoking to err on the safe side.
      const _exhaustiveCheck: never = status;
      void _exhaustiveCheck;
      return "canceled";
    }
  }
}
