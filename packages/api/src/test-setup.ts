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
