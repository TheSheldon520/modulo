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
import { and, desc, eq } from "drizzle-orm";
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
// Root export
// ---------------------------------------------------------------------------

export const salesAnalyticsRouter = router({
  deals: dealsRouter,
  contacts: contactsRouter,
  pipelineStages: pipelineStagesRouter,
});

export type SalesAnalyticsRouter = typeof salesAnalyticsRouter;
