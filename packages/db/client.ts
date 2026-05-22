// packages/db/client.ts
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * The Drizzle client type, exposed for tRPC middlewares and module routers.
 */
export type DbClient = ReturnType<typeof createClient>;

/**
 * Node 18+ ships a global `WebSocket`, which the Neon serverless driver uses
 * for the pooled connection. No `ws` polyfill is required on Node 24.
 */
if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to the repo-root `.env.local` (pooled Neon connection string).",
    );
  }

  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

/**
 * Cache the client on `globalThis` so that Next.js HMR in development does not
 * spawn a new connection pool on every reload.
 */
const globalForDb = globalThis as typeof globalThis & {
  __moduloDbClient?: DbClient;
};

let cachedClient: DbClient | undefined = globalForDb.__moduloDbClient;

/**
 * Lazily-initialised, process-wide singleton Drizzle client.
 * The `DATABASE_URL` guard runs on first access, not at import time.
 */
export function getDb(): DbClient {
  if (!cachedClient) {
    cachedClient = createClient();
    globalForDb.__moduloDbClient = cachedClient;
  }
  return cachedClient;
}
