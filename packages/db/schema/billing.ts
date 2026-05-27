// packages/db/schema/billing.ts
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./core";

/**
 * Lifecycle of a module subscription for an organization.
 *
 *   active     — paid and in good standing
 *   trial      — trial period (no charge yet)
 *   past_due   — last invoice failed, Stripe is retrying
 *   canceled   — subscription canceled (access revoked)
 *
 * `createTRPCContext` filters `enabled_modules` on `status = 'active'`, so a
 * canceled or past_due subscription stops granting module access automatically.
 * Surfacing `past_due` to the UI is still useful (banner + "fix payment" link),
 * which is why we keep the row instead of deleting it.
 */
export const moduleStatusEnum = pgEnum("module_status", [
  "active",
  "trial",
  "past_due",
  "canceled",
]);

/**
 * Modules activated for an organization.
 *
 * `moduleId` is a free-form identifier (e.g. "sales-analytics") and has no FK:
 * the module registry is static, defined in code, not a database table.
 *
 * Stripe-side identifiers are denormalised here for T0.9: every row of an org
 * shares the same `stripe_customer_id` (one Stripe Customer per org). Extracting
 * billing identity into a dedicated `organizations_billing` table is tracked
 * for T0.10 / Phase 1.
 */
export const enabledModules = pgTable(
  "enabled_modules",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 64 }).notNull(),
    status: moduleStatusEnum("status").notNull().default("active"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripeCustomerId: text("stripe_customer_id"),
    enabledAt: timestamp("enabled_at", { withTimezone: true }).defaultNow().notNull(),
    // Config libre par module. Forme : { [moduleSpecificKey]: unknown }.
    // Le typage Record<string, unknown> garantit "objet ou null", pas
    // "n'importe quoi".
    config: jsonb("config").$type<Record<string, unknown>>(),
  },
  (table) => [
    unique("enabled_modules_organization_id_module_id_unique").on(table.organizationId, table.moduleId),
  ],
);

export type EnabledModule = typeof enabledModules.$inferSelect;
export type NewEnabledModule = typeof enabledModules.$inferInsert;

/**
 * Union type derived from the Drizzle enum — single source of truth.
 * Mirrors the pgEnum values: "active" | "trial" | "past_due" | "canceled"
 */
export type ModuleStatus = typeof moduleStatusEnum.enumValues[number];

/**
 * Idempotency ledger for Stripe webhooks.
 *
 * Pattern: every webhook handler `INSERT INTO stripe_webhook_events (event_id)
 * ON CONFLICT DO NOTHING RETURNING event_id`. If `RETURNING` yields zero rows,
 * the event was already processed and the handler returns 200 silently. If the
 * handler throws after a successful insert, the row is deleted so Stripe can
 * retry (otherwise transient errors would be silently swallowed forever).
 *
 * The primary key is the Stripe event ID (`evt_...`), guaranteed unique by
 * Stripe — no extra UNIQUE constraint needed.
 */
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
