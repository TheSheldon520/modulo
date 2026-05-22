// packages/db/drizzle.config.ts
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit does not load `.env.local` on its own. The repo keeps a single
 * `.env.local` at its root so every workspace package shares one source of
 * truth. This file lives at `<repo>/packages/db`, so the root is two levels up.
 */
const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "..", "..");
const rootEnvLocal = resolve(repoRoot, ".env.local");

if (existsSync(rootEnvLocal)) {
  loadEnv({ path: rootEnvLocal });
}

/**
 * Migrations (db:migrate / db:push / db:studio) use the direct (unpooled)
 * Neon connection. `db:generate` only reads the TypeScript schema and needs
 * no database connection — so a missing URL must not break config loading.
 * The placeholder below is never reachable by connecting commands: those
 * fail loudly at connection time if the real value is absent.
 */
const url =
  process.env.DATABASE_URL_UNPOOLED ??
  "postgresql://DATABASE_URL_UNPOOLED-is-not-set/set-it-in-repo-root-.env.local";

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
