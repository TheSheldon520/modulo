// packages/db/schema/core.ts
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

/**
 * Per-tenant theme overrides — a flat map of CSS variable name → value. Stored
 * as `jsonb` (nullable, default null = use platform defaults). Kept
 * intentionally open in Phase 1: T1.1 only ships the column + the
 * `generateThemeVars` projection in `@modulo/ui`. The UI to edit it (color
 * picker OKLCH, density preset, radius preset) lands later.
 *
 * Discriminating between an empty theme (`{}`) and "use defaults" (`null`)
 * matters down the line: null means "no override at all", empty object means
 * "override declared but cleared". Both render identically today but the
 * distinction lets the future settings UI tell them apart.
 */
export type TenantTheme = Record<string, string> | null;

/**
 * Membership roles within an organization.
 * No SQL default — every membership must declare an explicit role.
 */
export const roleEnum = pgEnum("role", ["owner", "admin", "member", "viewer"]);

export const users = pgTable("users", {
  id: uuid("id")
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  email: text("email").notNull().unique(),
  // `name` stays nullable: OAuth providers may not return one
  // (GitHub `login` is used as a fallback in app code).
  name: text("name"),
  // Better Auth requires these two columns on the user model.
  // Email verification is wired but not enabled in T0.6 — defaults to false.
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const organizations = pgTable("organizations", {
  id: uuid("id")
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Tenant theme overrides. See `TenantTheme` above for the contract. Phase 1
  // ships the column only — the consumer is `generateThemeVars` in `@modulo/ui`
  // which projects this map to `style={...}` on the org layout. Edition UI
  // (color picker OKLCH, density, radius) lands later.
  theme: jsonb("theme").$type<TenantTheme>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("memberships_user_id_organization_id_unique").on(table.userId, table.organizationId),
    index("memberships_organization_id_idx").on(table.organizationId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
