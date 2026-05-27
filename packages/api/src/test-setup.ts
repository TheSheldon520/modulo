// packages/api/src/test-setup.ts
//
// Vitest global setup. The `@modulo/auth` and `@modulo/db` packages read
// process env at import time (`getDb()` is invoked synchronously inside
// `betterAuth(...)`), so importing anything from `@modulo/api` would crash
// without these vars set. We feed them dummy values: tests that exercise
// `publicProcedure` never hit the DB or Better Auth, so the values are
// inert. Integration tests added later will need a real DB and override
// this on their own.

process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/test?sslmode=disable";
process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-in-this-suite";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.GITHUB_CLIENT_ID ??= "test";
process.env.GITHUB_CLIENT_SECRET ??= "test";
process.env.GOOGLE_CLIENT_ID ??= "test";
process.env.GOOGLE_CLIENT_SECRET ??= "test";
// Stripe envs are required at module load by the static registry
// (`STRIPE_PRICE_SALES_ANALYTICS`) and lazily by `getStripeClient()`
// (`STRIPE_SECRET_KEY`). The values are inert: registry tests only read them
// back, no Stripe API call is made in the suite.
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy_for_vitest";
process.env.STRIPE_PRICE_SALES_ANALYTICS ??= "price_test_sales_analytics";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_dummy";
