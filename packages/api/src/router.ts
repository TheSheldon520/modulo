// packages/api/src/router.ts
//
// Root tRPC router. New sub-routers (one per module + cross-cutting features)
// are registered here. Keep it flat at the top level — the namespacing inside
// each sub-router is the source of structure.

import { salesAnalyticsRouter } from "@modulo/sales-analytics";

import { billingRouter } from "./routers/billing";
import { healthRouter } from "./routers/health";
import { organizationsRouter } from "./routers/organizations";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  organizations: organizationsRouter,
  billing: billingRouter,
  salesAnalytics: salesAnalyticsRouter,
});

export type AppRouter = typeof appRouter;
