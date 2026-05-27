CREATE TYPE "public"."module_status" AS ENUM('active', 'trial', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enabled_modules" ADD COLUMN "status" "module_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "enabled_modules" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "enabled_modules" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "enabled_modules" ADD CONSTRAINT "enabled_modules_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");