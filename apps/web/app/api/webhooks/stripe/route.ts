// apps/web/app/api/webhooks/stripe/route.ts
//
// Stripe webhook receiver. THE source of truth for `enabled_modules` writes —
// the tRPC `billing.createCheckoutSession` mutation never writes to that table;
// it only delegates to Stripe and lets the webhook close the loop.
//
// Security:
//   - Raw body via `request.text()` (signature verification needs the exact
//     bytes Stripe sent — `request.json()` would re-serialize and break it).
//   - Signature verified through `stripe.webhooks.constructEvent`. Any failure
//     returns 400 with no detail (don't leak whether the secret rotated, the
//     payload is malformed, etc.).
//   - `STRIPE_WEBHOOK_SECRET` is read lazily inside the handler, not at module
//     load: `stripe listen` provides it after the fact, and a missing secret
//     must crash *here* with a clear error, not silently at boot.
//
// Idempotency:
//   - INSERT INTO stripe_webhook_events ON CONFLICT DO NOTHING. If the event
//     was already processed, we return 200 immediately and Stripe stops retrying.
//   - If the handler throws after a successful insert, the row is deleted so
//     Stripe's retry will replay the event. Otherwise a transient DB error
//     would permanently block reprocessing.

import { eq } from "drizzle-orm";
import type Stripe from "stripe";

import { requireEnv } from "@modulo/auth/env";
import { getStripeClient } from "@modulo/api/stripe";
import { getDb, type DbClient } from "@modulo/db/client";
import {
  enabledModules,
  organizations,
  stripeWebhookEvents,
} from "@modulo/db/schema";
import { mapStripeStatusToModuleStatus } from "./_helpers";

/**
 * Routes a verified Stripe event to the matching handler. Returns nothing —
 * throws on persistence errors so the outer try/catch in `POST` can roll back
 * the idempotency row.
 */
async function handleStripeEvent(db: DbClient, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.orgId;
      const moduleSlug = session.metadata?.moduleSlug;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;
      const customerId =
        typeof session.customer === "string" ? session.customer : null;

      if (!orgId || !moduleSlug || !subscriptionId || !customerId) {
        // Missing metadata means a session created outside our flow (manual
        // dashboard test, third-party tool). Acknowledge and move on.
        console.warn(
          "[stripe-webhook] checkout.session.completed missing metadata",
          { sessionId: session.id },
        );
        return;
      }

      await db.transaction(async (tx) => {
        // Defense in depth against a forged session (e.g. leaked Stripe key
        // used to POST a checkout with arbitrary metadata). The FK on
        // `enabled_modules.organization_id` would also reject an unknown org,
        // but the resulting Postgres error would bubble up as a 500 and
        // trigger Stripe's retry loop. A pre-flight SELECT lets us treat
        // unknown-org as a legitimate no-op and ACK the event cleanly.
        const orgRows = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);
        if (orgRows.length === 0) {
          console.warn(
            "[stripe-webhook] checkout.session.completed for unknown org",
            { orgId, sessionId: session.id, customerId },
          );
          // Returning from inside the tx callback commits cleanly (no write
          // happened). The outer `stripeWebhookEvents` row stays — this is a
          // *handled* event with a no-op outcome, not an exception to retry.
          return;
        }

        await tx
          .insert(enabledModules)
          .values({
            organizationId: orgId,
            moduleId: moduleSlug,
            status: "active",
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
          })
          .onConflictDoUpdate({
            target: [enabledModules.organizationId, enabledModules.moduleId],
            set: {
              status: "active",
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: customerId,
            },
          });
      });
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const subscriptionId = readInvoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        console.warn("[stripe-webhook] invoice.paid without subscription", {
          invoiceId: invoice.id,
        });
        return;
      }
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(enabledModules)
          .set({ status: "active" })
          .where(eq(enabledModules.stripeSubscriptionId, subscriptionId))
          .returning({ id: enabledModules.id });
        if (updated.length === 0) {
          console.warn(
            "[stripe-webhook] invoice.paid for unknown subscription",
            { subscriptionId },
          );
        }
      });
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionId = readInvoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        console.warn(
          "[stripe-webhook] invoice.payment_failed without subscription",
          { invoiceId: invoice.id },
        );
        return;
      }
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(enabledModules)
          .set({ status: "past_due" })
          .where(eq(enabledModules.stripeSubscriptionId, subscriptionId))
          .returning({ id: enabledModules.id });
        if (updated.length === 0) {
          console.warn(
            "[stripe-webhook] invoice.payment_failed for unknown subscription",
            { subscriptionId },
          );
        }
      });
      return;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const orgId = subscription.metadata?.orgId;

      if (!orgId) {
        console.warn(
          "[stripe-webhook] customer.subscription.updated missing orgId in metadata",
          { subscriptionId: subscription.id },
        );
        return;
      }

      await db.transaction(async (tx) => {
        // Pre-flight: validate the org exists before writing. Guards against a
        // forged subscription with an arbitrary orgId in its metadata.
        const orgRows = await tx
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, orgId))
          .limit(1);

        if (orgRows.length === 0) {
          console.warn(
            "[stripe-webhook] customer.subscription.updated for unknown org",
            { subscriptionId: subscription.id, orgId },
          );
          return;
        }

        // The UPDATE filters only on `stripe_subscription_id` (UNIQUE), not on
        // `AND organization_id = orgId`. The pre-flight SELECT above already
        // validated the orgId from metadata against the DB; the real lock on
        // "this subscription belongs to this org" is the UNIQUE constraint on
        // `stripe_subscription_id` + Stripe's webhook signature on the event.
        // This matches the pattern of the four T0.9 handlers
        // (`invoice.paid`, `invoice.payment_failed`, `subscription.deleted`,
        // `checkout.session.completed`) — keeping the asymmetry-free for now.
        // Factorisation into a shared `updateModuleBySubscription(tx, ...)`
        // helper that uniformly adds the double-filter is tracked for Phase 1
        // (cf. "Refacto webhook handlers ~65% dup" in JOURNAL Session 7).
        const updated = await tx
          .update(enabledModules)
          .set({ status: mapStripeStatusToModuleStatus(subscription.status) })
          .where(eq(enabledModules.stripeSubscriptionId, subscription.id))
          .returning({ id: enabledModules.id });

        if (updated.length === 0) {
          console.warn(
            "[stripe-webhook] customer.subscription.updated matched no rows",
            {
              subscriptionId: subscription.id,
              orgId,
              reason: "unknown subscription for org",
            },
          );
        }
      });
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(enabledModules)
          .set({ status: "canceled" })
          .where(eq(enabledModules.stripeSubscriptionId, subscription.id))
          .returning({ id: enabledModules.id });
        if (updated.length === 0) {
          console.warn(
            "[stripe-webhook] customer.subscription.deleted for unknown subscription",
            { subscriptionId: subscription.id },
          );
        }
      });
      return;
    }

    default: {
      // Stripe sends ~150 event types — we acknowledge the long tail without
      // logging. The idempotency row still records the event id, so if we
      // later decide to handle one of these events we can replay it via
      // Stripe's dashboard (after manually deleting the row).
      return;
    }
  }
}

/**
 * Reads the `subscription` field off an Invoice. The Stripe Node typings
 * model it as `string | Stripe.Subscription | null` (potentially expanded);
 * we only care about the string id and treat anything else as "no sub".
 */
function readInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) return sub.id;
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  // Raw bytes — must NOT pass through `request.json()`.
  const rawBody = await request.text();
  const stripe = getStripeClient();
  const webhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    // Signature mismatch / malformed payload — opaque 400, don't leak details.
    return new Response("Invalid signature", { status: 400 });
  }

  const db = getDb();

  const inserted = await db
    .insert(stripeWebhookEvents)
    .values({ eventId: event.id })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });

  if (inserted.length === 0) {
    // Already processed — acknowledge so Stripe stops retrying.
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(db, event);
  } catch (err) {
    // Roll back the idempotency row so Stripe's automatic retry replays this
    // event. Without this we'd silently mark the event "processed" while
    // having failed to actually persist anything.
    await db
      .delete(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.eventId, event.id));
    // Webhook observability: stderr is the only signal we have today before a
    // proper structured logger lands (Phase 1). `console.error` is allowed by
    // the eslint config (`no-console` allow-list).
    console.error("[stripe-webhook] handler failed", {
      eventId: event.id,
      type: event.type,
      error: err,
    });
    return new Response("Internal error", { status: 500 });
  }

  return Response.json({ received: true });
}
