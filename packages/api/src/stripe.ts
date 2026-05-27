// packages/api/src/stripe.ts
//
// Lazy, process-wide Stripe client singleton. Mirrors the `getDb()` pattern:
// the env var is read on first call, not at module import, so test files that
// don't touch Stripe never need to set `STRIPE_SECRET_KEY`.
//
// `apiVersion` is pinned explicitly — without it the SDK silently follows the
// account's default API version, which means a Stripe dashboard toggle could
// change response shapes at runtime. Pinning here means an SDK bump (which
// also bumps the default API version) is an explicit, reviewable code change.

import Stripe from "stripe";

import { requireEnv } from "@modulo/auth/env";

/**
 * Stripe API version pinned to match the stable date Stripe SDK 22.1.1 was
 * generated against (`OPENAPI_VERSION`). Bumping the SDK requires bumping this
 * string too — see https://docs.stripe.com/upgrades for breaking changes.
 */
const STRIPE_API_VERSION = "2026-04-22.dahlia";

let cached: Stripe | undefined;

const globalForStripe = globalThis as typeof globalThis & {
  __moduloStripe?: Stripe;
};

export function getStripeClient(): Stripe {
  if (!cached) cached = globalForStripe.__moduloStripe;
  if (!cached) {
    cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
    globalForStripe.__moduloStripe = cached;
  }
  return cached;
}

export type StripeClient = Stripe;
