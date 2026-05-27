// packages/auth/src/index.ts
//
// Better Auth server instance — single source of truth for authentication.
//
// Lazy factory pattern (mirrors `getDb()` in `packages/db/client.ts`): the
// Better Auth instance is built on first call to `getAuth()`, NOT at module
// load. This matters because:
//
//   - `betterAuth({...})` reads BETTER_AUTH_SECRET / BETTER_AUTH_URL /
//     OAuth client IDs synchronously and the Drizzle adapter calls `getDb()`
//     which itself reads DATABASE_URL. Doing all of that at import time
//     forced every consumer (including Vitest suites that never touch auth)
//     to set those vars just to load the module graph.
//
//   - With this factory, `import { getAuth } from "@modulo/auth"` is a
//     zero-effect operation. Env vars are only required at the first actual
//     API call (e.g. `getAuth().api.getSession(...)`).
//
// Instance is cached on `globalThis` so Next.js HMR in dev does not spawn a
// fresh BA instance / DB pool on every reload. The cache key is private
// (double-underscore prefix) to avoid colliding with anything else.
//
// The Drizzle adapter is given the flat schema barrel (one namespace exposing
// every table). `usePlural: true` tells Better Auth to look up the pluralised
// table names (users / sessions / accounts / verifications) that match our
// schema.
//
// `advanced.database.generateId: "uuid"` is mandatory: without it Better Auth
// generates 32-char nanoids, which cannot be inserted into our `uuid` PG
// columns. With `"uuid"`, BA defers ID generation to the DB layer and
// Drizzle's `$defaultFn(() => uuidv7())` takes over.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@modulo/db/client";
import * as schema from "@modulo/db/schema";

import { requireEnv } from "./env";

/**
 * The fully-built Better Auth instance type. Derived via `ReturnType` so we
 * never have to instantiate BA at the type level — keeps the import side
 * effect free.
 */
export type AuthInstance = ReturnType<typeof betterAuth>;

function createAuth(): AuthInstance {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
      usePlural: true,
    }),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    socialProviders: {
      github: {
        clientId: requireEnv("GITHUB_CLIENT_ID"),
        clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
      },
      google: {
        clientId: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      },
    },
  });
}

/**
 * Process-wide cache. Survives HMR by living on `globalThis`.
 */
const globalForAuth = globalThis as typeof globalThis & {
  __moduloAuth?: AuthInstance;
};

let cachedAuth: AuthInstance | undefined = globalForAuth.__moduloAuth;

/**
 * Lazily-initialised, process-wide singleton Better Auth instance.
 *
 * All BA env vars (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
 * `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`) are read on first
 * call — never at import time. Callers MUST call `getAuth()` inline; do not
 * cache the return in a top-level `const` (that re-introduces the eager
 * pattern this refactor removed).
 */
export function getAuth(): AuthInstance {
  if (!cachedAuth) {
    cachedAuth = createAuth();
    globalForAuth.__moduloAuth = cachedAuth;
  }
  return cachedAuth;
}

/**
 * Session type derived structurally from the BA instance. Computed via
 * `ReturnType<typeof betterAuth>` so we never need to instantiate BA to
 * obtain the type — keeps the import side effect free even for type-only
 * consumers.
 */
export type Session = AuthInstance["$Infer"]["Session"];
