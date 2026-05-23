// packages/db/schema/auth.ts
//
// Tables required by Better Auth. The shape (column names, types, nullability,
// FK behaviour) is fixed by the BA Drizzle adapter contract — do not rename
// or repurpose columns here. See the BA docs for the canonical schema.
//
// All tables use pluralised names (`sessions`, `accounts`, `verifications`),
// which matches the BA config flag `usePlural: true` set in @modulo/auth.
//
// IDs are uuid v7, generated at the app layer via the `uuidv7` library and
// Drizzle's `$defaultFn` — consistent with `users` / `organizations` and
// compatible with BA's `advanced.database.generateId: "uuid"` mode.

import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { users } from "./core";

/**
 * One row per active login. The cookie carries `token`; BA looks it up here.
 */
export const sessions = pgTable("sessions", {
  id: uuid("id")
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * One row per credential a user owns. `providerId` is "github" / "google" for
 * OAuth, "credential" for email+password (`password` holds the hash).
 * `accountId` is the user's stable ID at the provider (or the user's PK for
 * the "credential" provider).
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("accounts_provider_id_account_id_unique").on(table.providerId, table.accountId),
  ],
);

/**
 * Generic verification slot used by BA for email verification, password
 * reset, magic-link tokens, etc. Identifier is typically the email address;
 * value is the hashed/opaque token.
 */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
