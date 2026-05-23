// packages/auth/src/env.ts
//
// Tiny env helper. Extracted from `index.ts` so it can be unit-tested without
// pulling in Better Auth or the Drizzle adapter (importing `index.ts` triggers
// a DB connection guard, which is unwanted in a Vitest run).

/**
 * Reads an environment variable, throwing a descriptive error if it's missing
 * or empty. `undefined` and the empty string are treated identically — both
 * mean "unset" for our purposes.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it to the repo-root \`.env.local\`.`);
  }
  return value;
}
