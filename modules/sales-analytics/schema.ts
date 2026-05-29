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
 * `color` is a nullable text column (no default at the DB layer): the UI
 * substitutes a theme-aware fallback when the org hasn't picked one. We
 * intentionally validate it as a hex `#RRGGBB` string at the Zod layer for
 * T1.3 — switching to OKLCH (consumed directly by the kanban UI) will be
 * revisited in T1.5+ alongside the design-system tokens story.
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
    /** Optional column colour. Hex `#RRGGBB` for T1.3 (see block comment). */
    color: text("color"),
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
 * FK'd here:
 *
 *   - `stage` is stored as the lowercase stage CODE (text) — currently the
 *     small literal union `lead | qualified | proposal | won | lost`.
 *     Rationale: codes are short, stable, persisted form; UI labels are
 *     resolved via i18n at render time. T1.5+ (kanban UI) will revisit
 *     whether to switch to a dynamic FK against `sales_pipeline_stages.id`
 *     once the org-managed stage CRUD ships.
 *
 *   - `contactId` is a `uuid` typed at the app layer but with no DB-level
 *     FK constraint yet. Rationale: a deal may exist without a contact (the
 *     salesperson logs an opportunity from a discovery call before they have
 *     a contact record). Migrating it to a nullable FK is a one-liner in
 *     T1.5+ once the create-deal flow consistently associates a contact.
 *
 * Both choices are tracked as tech debt for T1.5+ in JOURNAL.md.
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
    index("org_stage_idx").on(table.organizationId, table.stage),
  ],
);

export type SalesPipelineStage = typeof salesPipelineStages.$inferSelect;
export type NewSalesPipelineStage = typeof salesPipelineStages.$inferInsert;

export type SalesContact = typeof salesContacts.$inferSelect;
export type NewSalesContact = typeof salesContacts.$inferInsert;

export type SalesDeal = typeof salesDeals.$inferSelect;
export type NewSalesDeal = typeof salesDeals.$inferInsert;
