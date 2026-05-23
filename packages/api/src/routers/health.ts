// packages/api/src/routers/health.ts
//
// Liveness / debug router. Exposes three lightweight probes the app shell
// (and humans during dev) call to verify the stack is wired:
//
//   ping     — public, returns server timestamp. No I/O.
//   dbCheck  — public, runs `SELECT 1` and reports latency. Never throws.
//   whoami   — authed, echoes user + active org + enabled modules.

import { sql } from "drizzle-orm";

import { authedProcedure, publicProcedure } from "../procedures";
import { router } from "../trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return {
      ok: true as const,
      timestamp: new Date().toISOString(),
    };
  }),

  dbCheck: publicProcedure.query(async ({ ctx }) => {
    const start = performance.now();
    try {
      await ctx.db.execute(sql`select 1`);
      return {
        ok: true as const,
        latencyMs: Math.round(performance.now() - start),
      };
    } catch {
      // Healthcheck contract: never throw — surface failure as `ok: false`
      // so the UI can render a degraded state instead of an error boundary.
      return {
        ok: false as const,
        latencyMs: Math.round(performance.now() - start),
      };
    }
  }),

  whoami: authedProcedure.query(({ ctx }) => {
    return {
      user: ctx.user,
      activeOrg: ctx.activeOrg,
      enabledModules: ctx.enabledModules,
    };
  }),
});
