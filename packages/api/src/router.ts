// packages/api/src/router.ts
//
// Root tRPC router. New sub-routers (one per module + cross-cutting features)
// are registered here. Keep it flat at the top level — the namespacing inside
// each sub-router is the source of structure.

import { billingRouter } from "./routers/billing";
import { healthRouter } from "./routers/health";
import { organizationsRouter } from "./routers/organizations";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  organizations: organizationsRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
