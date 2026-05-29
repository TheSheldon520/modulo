// modules/sales-analytics/router.ts
//
// tRPC router for the "Sales Analytics" module. Every procedure here starts
// from `moduleProcedure("sales-analytics")` so the "module-not-enabled → 403"
// check is applied automatically and `ctx.activeOrg` is narrowed to non-null.
//
// Three sub-routers (deals / contacts / pipelineStages) are nested under the
// root `salesAnalytics` namespace at the AppRouter level, so the client surface
// is `trpc.salesAnalytics.deals.list`, etc.
//
// Defence in depth: every mutation includes
// `eq(table.organizationId, ctx.activeOrg.id)` in its WHERE clause even though
// `moduleProcedure` already filters by org — a missing WHERE here would let a
// caller mutate another tenant's row by passing its id. Belt + suspenders.

import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

// Importing from `@modulo/api/trpc` + `@modulo/api/procedures` (not the root
// barrel) is deliberate: the root barrel re-exports `appRouter`, which itself
// imports `salesAnalyticsRouter` — going through `.` would create an ES-module
// cycle where this file evaluates before `moduleProcedure` is bound. The
// dedicated sub-paths break the cycle and keep the binding stable.
import { moduleProcedure } from "@modulo/api/procedures";
import { router } from "@modulo/api/trpc";

import {
  salesContacts,
  salesDeals,
  salesPipelineStages,
} from "./schema";
// Wire schemas + canonical stage codes live in their own pure-isomorphic file
// so Client Components and `apps/web/lib/*-form-schema.ts` factories can
// consume them without dragging `@trpc/server` into the browser bundle.
import {
  contactCreateSchema,
  contactUpdateSchema,
  dealCreateSchema,
  dealUpdateSchema,
  pipelineStageCreateSchema,
  uuidSchema,
} from "./schemas";
// Period helpers — pure isomorphic, no server imports. Also exported via the
// `./lib/period` sub-export so the UI can consume `Period` + `periodSchema`
// without touching this router barrel.
import {
  computeVariation,
  periodSchema,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
} from "./lib/period";

// Re-export from the router so existing server-side callers that already
// import from `@modulo/sales-analytics` keep working. Client Components MUST
// import from `@modulo/sales-analytics/schemas` instead — see the schemas.ts
// header for the rationale.
export {
  DEAL_STAGES,
  contactCreateSchema,
  contactUpdateSchema,
  dealCreateSchema,
  dealUpdateSchema,
  pipelineStageCreateSchema,
} from "./schemas";
export type { DealStage } from "./schemas";

const salesAnalyticsProcedure = moduleProcedure("sales-analytics");

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const dealsRouter = router({
  list: salesAnalyticsProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(salesDeals)
      .where(eq(salesDeals.organizationId, ctx.activeOrg.id))
      .orderBy(desc(salesDeals.createdAt));
  }),

  create: salesAnalyticsProcedure
    .input(dealCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(salesDeals)
        .values({
          organizationId: ctx.activeOrg.id,
          name: input.name,
          stage: input.stage,
          amount: input.amount,
          ownerId: input.ownerId,
          contactId: input.contactId ?? null,
          closedAt: input.closedAt ?? null,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create deal",
        });
      }
      return created;
    }),

  update: salesAnalyticsProcedure
    .input(dealUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      // Strict partial of the insert shape — no `any`. Drizzle's `update().set()`
      // accepts a partial, but we type the local var to surface bad assignments.
      const updateData: Partial<typeof salesDeals.$inferInsert> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.stage !== undefined) updateData.stage = rest.stage;
      if (rest.amount !== undefined) updateData.amount = rest.amount;
      if (rest.ownerId !== undefined) updateData.ownerId = rest.ownerId;
      if (rest.contactId !== undefined) updateData.contactId = rest.contactId;
      if (rest.closedAt !== undefined) updateData.closedAt = rest.closedAt;

      const [updated] = await ctx.db
        .update(salesDeals)
        .set(updateData)
        .where(
          and(
            eq(salesDeals.id, id),
            eq(salesDeals.organizationId, ctx.activeOrg.id),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }
      return updated;
    }),

  delete: salesAnalyticsProcedure
    .input(z.object({ id: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(salesDeals)
        .where(
          and(
            eq(salesDeals.id, input.id),
            eq(salesDeals.organizationId, ctx.activeOrg.id),
          ),
        )
        .returning({ id: salesDeals.id });
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }
      return { id: deleted.id };
    }),
});

const contactsRouter = router({
  list: salesAnalyticsProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(salesContacts)
      .where(eq(salesContacts.organizationId, ctx.activeOrg.id))
      .orderBy(desc(salesContacts.createdAt));
  }),

  create: salesAnalyticsProcedure
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(salesContacts)
        .values({
          organizationId: ctx.activeOrg.id,
          name: input.name,
          email: input.email ?? null,
          company: input.company ?? null,
          phone: input.phone ?? null,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create contact",
        });
      }
      return created;
    }),

  update: salesAnalyticsProcedure
    .input(contactUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const updateData: Partial<typeof salesContacts.$inferInsert> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.email !== undefined) updateData.email = rest.email;
      if (rest.company !== undefined) updateData.company = rest.company;
      if (rest.phone !== undefined) updateData.phone = rest.phone;

      const [updated] = await ctx.db
        .update(salesContacts)
        .set(updateData)
        .where(
          and(
            eq(salesContacts.id, id),
            eq(salesContacts.organizationId, ctx.activeOrg.id),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }
      return updated;
    }),

  delete: salesAnalyticsProcedure
    .input(z.object({ id: uuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(salesContacts)
        .where(
          and(
            eq(salesContacts.id, input.id),
            eq(salesContacts.organizationId, ctx.activeOrg.id),
          ),
        )
        .returning({ id: salesContacts.id });
      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }
      return { id: deleted.id };
    }),
});

const pipelineStagesRouter = router({
  list: salesAnalyticsProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(salesPipelineStages)
      .where(eq(salesPipelineStages.organizationId, ctx.activeOrg.id))
      .orderBy(salesPipelineStages.position);
  }),

  create: salesAnalyticsProcedure
    .input(pipelineStageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(salesPipelineStages)
        .values({
          organizationId: ctx.activeOrg.id,
          name: input.name,
          position: input.position,
          color: input.color ?? null,
        })
        .returning();
      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create pipeline stage",
        });
      }
      return created;
    }),

  // Note: `update`, `delete` and `reorder` are intentionally deferred to T1.5+
  // (kanban UI ticket). Adding them ahead of the UI risks designing the wire
  // shape blind — reorder in particular needs the bulk-position story before
  // we pick an API surface.
});

// ---------------------------------------------------------------------------
// Overview sub-router — KPIs, sparklines, distributions
// ---------------------------------------------------------------------------
//
// All monetary aggregations use `::float8` SQL cast (rather than parseFloat
// post-select) so the JS number lands directly from Postgres without an extra
// string-parse step. COALESCE guarantees 0 instead of null for empty windows.
//
// Defence-in-depth: every query asserts `eq(salesDeals.organizationId, ctx.activeOrg.id)`
// even though moduleProcedure already enforces org scope. Belt + suspenders
// (see router header comment).

const overviewRouter = router({
  query: salesAnalyticsProcedure
    .input(z.object({ period: periodSchema.default("90d") }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.activeOrg.id;
      const now = new Date();
      const { start: periodStart } = resolvePeriodRange(input.period, now);
      const { start: prevStart, end: prevEnd } = resolvePreviousPeriodRange(
        input.period,
        now,
      );

      // -----------------------------------------------------------------------
      // 1. Current-period KPIs — won revenue + count, pipeline value
      // -----------------------------------------------------------------------

      // Revenue + won count for the current period (closed in [periodStart, now])
      const [currentWon] = await ctx.db
        .select({
          revenue: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
          wonCount: sql<number>`COUNT(*)::int`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "won"),
            gte(salesDeals.closedAt, periodStart),
            lte(salesDeals.closedAt, now),
          ),
        );

      // Lost count for the current period (denominator for conversion rate)
      const [currentLost] = await ctx.db
        .select({
          lostCount: sql<number>`COUNT(*)::int`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "lost"),
            gte(salesDeals.closedAt, periodStart),
            lte(salesDeals.closedAt, now),
          ),
        );

      // Pipeline value = open deals (lead + qualified + proposal), no time filter
      const [currentPipeline] = await ctx.db
        .select({
          pipelineValue: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            sql`stage IN ('lead', 'qualified', 'proposal')`,
          ),
        );

      const currentRevenue = currentWon?.revenue ?? 0;
      const currentWonCount = currentWon?.wonCount ?? 0;
      const currentLostCount = currentLost?.lostCount ?? 0;
      const closedTotal = currentWonCount + currentLostCount;
      const currentConversionRate: number | null =
        closedTotal === 0 ? null : (currentWonCount / closedTotal) * 100;
      const currentPipelineValue = currentPipeline?.pipelineValue ?? 0;

      // -----------------------------------------------------------------------
      // 2. Previous-period KPIs — for variation computation
      // -----------------------------------------------------------------------

      const [prevWon] = await ctx.db
        .select({
          revenue: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
          wonCount: sql<number>`COUNT(*)::int`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "won"),
            gte(salesDeals.closedAt, prevStart),
            lte(salesDeals.closedAt, prevEnd),
          ),
        );

      const [prevLost] = await ctx.db
        .select({
          lostCount: sql<number>`COUNT(*)::int`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "lost"),
            gte(salesDeals.closedAt, prevStart),
            lte(salesDeals.closedAt, prevEnd),
          ),
        );

      const prevRevenue = prevWon?.revenue ?? 0;
      const prevWonCount = prevWon?.wonCount ?? 0;
      const prevLostCount = prevLost?.lostCount ?? 0;
      const prevClosedTotal = prevWonCount + prevLostCount;
      const prevConversionRate: number | null =
        prevClosedTotal === 0 ? null : (prevWonCount / prevClosedTotal) * 100;

      // Pipeline value variation: compare current snapshot vs same snapshot
      // one period-length ago. Since we have no historical snapshots of open
      // deals, we use the same current value for both (delta = 0, neutral badge).
      // T1.5: requires a deal-state event log to snapshot pipeline-over-time.
      const pipelineVariation = computeVariation(
        currentPipelineValue,
        currentPipelineValue,
      );

      const revenueVariation = computeVariation(currentRevenue, prevRevenue);
      const wonCountVariation = computeVariation(currentWonCount, prevWonCount);
      const conversionVariation = computeVariation(
        currentConversionRate ?? 0,
        prevConversionRate ?? 0,
      );

      // -----------------------------------------------------------------------
      // 3. Sparklines — weekly buckets within the period
      //    revenue + wonCount: real SQL GROUP BY week
      //    conversionRate + pipelineValue: [] (no historical snapshots yet)
      //    T1.5: requires deal-state event log to snapshot pipeline-over-time.
      // -----------------------------------------------------------------------

      const sparklineRows = await ctx.db
        .select({
          week: sql<string>`to_char(date_trunc('week', closed_at), 'YYYY-MM-DD')`,
          revenue: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
          wonCount: sql<number>`COUNT(*)::int`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "won"),
            gte(salesDeals.closedAt, periodStart),
            lte(salesDeals.closedAt, now),
          ),
        )
        .groupBy(sql`date_trunc('week', closed_at)`)
        .orderBy(sql`date_trunc('week', closed_at)`);

      const sparklineRevenue = sparklineRows.map((r) => ({
        x: r.week,
        y: r.revenue,
      }));
      const sparklineWonCount = sparklineRows.map((r) => ({
        x: r.week,
        y: r.wonCount,
      }));

      // -----------------------------------------------------------------------
      // 4. Revenue by month — last 12 months, independent of period filter
      // -----------------------------------------------------------------------

      const twelveMonthsAgo = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 12,
          now.getUTCDate(),
        ),
      );

      const monthRows = await ctx.db
        .select({
          month: sql<string>`to_char(date_trunc('month', closed_at), 'YYYY-MM')`,
          revenue: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
        })
        .from(salesDeals)
        .where(
          and(
            eq(salesDeals.organizationId, orgId),
            eq(salesDeals.stage, "won"),
            gte(salesDeals.closedAt, twelveMonthsAgo),
            lte(salesDeals.closedAt, now),
          ),
        )
        .groupBy(sql`date_trunc('month', closed_at)`)
        .orderBy(sql`date_trunc('month', closed_at)`);

      // Fill all 12 months so the chart never has gaps — months without won
      // deals appear as 0.
      const revenueByMonth: Array<{ month: string; revenue: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
        );
        const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        const row = monthRows.find((r) => r.month === label);
        revenueByMonth.push({ month: label, revenue: row?.revenue ?? 0 });
      }

      // -----------------------------------------------------------------------
      // 5. Stage distribution — current state, all stages with at least 1 deal
      // -----------------------------------------------------------------------

      const stageRows = await ctx.db
        .select({
          stage: salesDeals.stage,
          count: sql<number>`COUNT(*)::int`,
          amount: sql<number>`COALESCE(SUM(amount)::float8, 0)`,
        })
        .from(salesDeals)
        .where(eq(salesDeals.organizationId, orgId))
        .groupBy(salesDeals.stage)
        .orderBy(salesDeals.stage);

      const stageDistribution = stageRows.map((r) => ({
        stage: r.stage,
        count: r.count,
        amount: r.amount,
      }));

      // -----------------------------------------------------------------------
      // 6. Recent deals — top 10, projected columns only (wire-shape minimal)
      // -----------------------------------------------------------------------

      const recentDeals = await ctx.db
        .select({
          id: salesDeals.id,
          name: salesDeals.name,
          amount: salesDeals.amount,
          stage: salesDeals.stage,
          createdAt: salesDeals.createdAt,
        })
        .from(salesDeals)
        .where(eq(salesDeals.organizationId, orgId))
        .orderBy(desc(salesDeals.createdAt))
        .limit(10);

      // -----------------------------------------------------------------------
      // Assemble and return
      // -----------------------------------------------------------------------

      return {
        kpis: {
          revenue: currentRevenue,
          wonCount: currentWonCount,
          conversionRate: currentConversionRate,
          pipelineValue: currentPipelineValue,
        },
        variations: {
          revenue: revenueVariation,
          wonCount: wonCountVariation,
          conversionRate: conversionVariation,
          pipelineValue: pipelineVariation,
        },
        sparklines: {
          revenue: sparklineRevenue,
          wonCount: sparklineWonCount,
          // T1.5: requires deal-state event log to snapshot pipeline-over-time.
          conversionRate: [] as Array<{ x: string; y: number }>,
          pipelineValue: [] as Array<{ x: string; y: number }>,
        },
        revenueByMonth,
        stageDistribution,
        recentDeals,
      };
    }),
});

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export const salesAnalyticsRouter = router({
  deals: dealsRouter,
  contacts: contactsRouter,
  pipelineStages: pipelineStagesRouter,
  overview: overviewRouter,
});

export type SalesAnalyticsRouter = typeof salesAnalyticsRouter;
