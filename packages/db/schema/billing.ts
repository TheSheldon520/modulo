// packages/db/schema/billing.ts
import { jsonb, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./core";

/**
 * Modules activated for an organization.
 *
 * `moduleId` is a free-form identifier (e.g. "sales-analytics") and has no FK:
 * the module registry is static, defined in code, not a database table.
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
    enabledAt: timestamp("enabled_at", { withTimezone: true }).defaultNow().notNull(),
    // Config libre par module. Forme : { [moduleSpecificKey]: any }.
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
