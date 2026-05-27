// modules/sales-analytics/schema.ts
//
// Drizzle schema for the "Sales Analytics" module.
//
// Every table here MUST:
//   - carry `organization_id uuid NOT NULL REFERENCES organizations(id)`
//     with `ON DELETE CASCADE`
//   - index `organization_id`
//   - use uuid v7 PKs (generated via `uuidv7()` at the app layer)
//   - use timestamptz for time columns
//
// Tables are exported individually and the file is re-exported from
// `packages/db/schema/index.ts` so `drizzle-kit` discovers them.

import { index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

import { organizations, users } from "@modulo/db/schema";

/**
 * Pipeline stages (Lead, Qualified, Proposal, Won, Lost, …). Each org defines
 * its own ordered list — `position` is the sort key. No global default set is
 * seeded by the migration: the module's create-deal flow will offer to seed a
 * "Default pipeline" on first use (T1.3+).
 *
 * T1.3 debt: the ROADMAP T1.2 spec also lists a `color` column (OKLCH string
 * or design-system token reference) used by the kanban UI to colour each
 * column. Intentionally omitted from T1.2 — kanban arrives in T1.5, and we
 * want the colour story (OKLCH validation, theme-aware fallback) designed
 * holistically with that ticket rather than scaffolded blindly here.
 */
export const salesPipelineStages = pgTable(
  "sales_pipeline_stages",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /**
     * Sort order within the org's pipeline. Integer (not float) — re-ordering
     * rewrites positions in bulk on save; we don't need fractional indices
     * for the foreseeable volume.
     */
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("sales_pipeline_stages_organization_id_idx").on(table.organizationId)],
);

/**
 * People we sell to. Minimal columns for T1.2 — the real CRM lives in its own
 * future module (`@modulo/crm`); `sales-analytics` keeps a denormalised
 * snapshot until the cross-module sync story is designed (Phase 2+).
 */
export const salesContacts = pgTable(
  "sales_contacts",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("sales_contacts_organization_id_idx").on(table.organizationId)],
);

/**
 * Sales deals — the heart of the module. `ownerId` is FK'd to `users` (the
 * salesperson responsible). `stage` and `contactId` are intentionally NOT
 * FK'd here for T1.2:
 *
 *   - `stage` is stored as the stage NAME (text) rather than a FK to
 *     `sales_pipeline_stages.id`. Rationale: stages can be renamed; we want
 *     the historical deal label to survive renames. T1.3 will revisit this
 *     once we have a UI to manage stages (and we may switch to a stable
 *     stage code).
 *
 *   - `contactId` is a `uuid` typed at the app layer but with no DB-level
 *     FK constraint yet. Rationale: a deal may exist without a contact (the
 *     salesperson logs an opportunity from a discovery call before they have
 *     a contact record). Migrating it to a nullable FK is a one-liner in T1.3
 *     once the create-deal flow always associates a contact.
 *
 * Both choices are tracked as tech debt in JOURNAL.md (T1.3).
 *
 * `amount` is a `numeric(14, 2)` — pure decimal, no float drift. Stored as
 * a string at the JS layer (Drizzle's `numeric` default behaviour) to avoid
 * Number precision loss above 2^53.
 */
export const salesDeals = pgTable(
  "sales_deals",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Stage name (text, not FK). See block comment above. */
    stage: text("stage").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    /** Salesperson owning the deal. Membership-level guard happens at the
     *  procedure layer; the DB only checks the user exists. */
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Linked contact (no FK at the DB layer for T1.2 — see block comment). */
    contactId: uuid("contact_id"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("sales_deals_organization_id_idx").on(table.organizationId),
    // T1.3 debt: add a composite (organization_id, stage) index when the
    // kanban filter (`WHERE organization_id = ? AND stage = ?`) becomes a hot
    // path (T1.5). MODULE_BLUEPRINT lists it as `orgStageIdx` — omitted now
    // because no procedure consumes it yet and we'd be guessing column order
    // ahead of the real query plan.
  ],
);

export type SalesPipelineStage = typeof salesPipelineStages.$inferSelect;
export type NewSalesPipelineStage = typeof salesPipelineStages.$inferInsert;

export type SalesContact = typeof salesContacts.$inferSelect;
export type NewSalesContact = typeof salesContacts.$inferInsert;

export type SalesDeal = typeof salesDeals.$inferSelect;
export type NewSalesDeal = typeof salesDeals.$inferInsert;
