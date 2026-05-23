// packages/api/src/router.ts
//
// Root tRPC router. New sub-routers (one per module + cross-cutting features)
// are registered here. Keep it flat at the top level — the namespacing inside
// each sub-router is the source of structure.

import { healthRouter } from "./routers/health";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
