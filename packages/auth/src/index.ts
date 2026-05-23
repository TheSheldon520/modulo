// packages/auth/src/index.ts
//
// Better Auth server instance — single source of truth for authentication.
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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to the repo-root \`.env.local\`.`);
  }
  return value;
}

export const auth = betterAuth({
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

export type Session = typeof auth.$Infer.Session;
