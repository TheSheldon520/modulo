-- Renames `title → name` on sales_deals and `full_name → name` on
-- sales_contacts to align with the T1.2 brief / BLUEPRINT / ROADMAP, and
-- adds the missing `phone` column on sales_contacts.
--
-- Drizzle-kit generated DROP COLUMN + ADD COLUMN (the columns are NOT NULL
-- so a naive replay against a populated table would fail). We rewrote the
-- migration as ALTER ... RENAME COLUMN so it is safe cross-environment
-- (zero data today, but the same script must hold against a real prod DB).
ALTER TABLE "sales_contacts" RENAME COLUMN "full_name" TO "name";--> statement-breakpoint
ALTER TABLE "sales_contacts" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "sales_deals" RENAME COLUMN "title" TO "name";
