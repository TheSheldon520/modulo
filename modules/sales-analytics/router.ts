// modules/sales-analytics/router.ts
//
// tRPC router for the "Sales Analytics" module. Every procedure here MUST start
// from `moduleProcedure("sales-analytics")` so the "module-not-enabled → 403" check is
// applied automatically and `ctx.activeOrg` is narrowed to non-null.
//
// T1.2 ships an empty router shell — actual procedures land in T1.3+.

import { moduleProcedure, router } from "@modulo/api";

const salesAnalyticsProcedure = moduleProcedure("sales-analytics");

export const salesAnalyticsRouter = router({
  // Procedures land in T1.3+. Keeping the namespace declared so the root
  // router can mount it without rewiring imports later.
  _placeholder: salesAnalyticsProcedure.query(() => ({ ok: true as const })),
});

export type SalesAnalyticsRouter = typeof salesAnalyticsRouter;
