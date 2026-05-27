// packages/api/src/routers/billing.ts
//
// Billing sub-router — three procedures consumed by `/settings/billing`.
//
//   listAvailableModules    — cross-references the static registry with the
//                             org's `enabled_modules` rows, returning per-module
//                             activation status.
//   createCheckoutSession   — provisions a Stripe Customer if needed, opens a
//                             Checkout session for the given module's price.
//   createPortalSession     — opens the Stripe Customer Portal (cancel /
//                             update card / view invoices).
//
// Write-side persistence of subscription rows lives in the webhook handler —
// this router never writes to `enabled_modules`. The split keeps "intent"
// (user clicks Activate) and "fact" (Stripe confirms payment) separate.

import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { requireEnv } from "@modulo/auth/env";
import { enabledModules } from "@modulo/db/schema";

import { getModule, listAvailableModules } from "../modules/registry";
import { orgProcedure } from "../procedures";
import { getStripeClient } from "../stripe";
import { router } from "../trpc";

/**
 * Per-module activation status as surfaced to the UI. Mirrors the DB enum
 * plus two purely client-side variants:
 *   inactive    — module is `available` in the registry but no row in DB
 *   coming_soon — module is flagged `coming_soon` in the registry
 */
export type ActivationStatus =
  | "active"
  | "trial"
  | "past_due"
  | "canceled"
  | "inactive"
  | "coming_soon";

export interface ModuleListing {
  slug: string;
  name: string;
  description: string;
  monthlyPriceLabel?: string;
  activationStatus: ActivationStatus;
}

export const billingRouter = router({
  /**
   * Joins the static registry with `enabled_modules` rows for the active org.
   * Returns every registry entry — UI filters/sorts to taste. We intentionally
   * do NOT filter on `status='active'` here: the UI must surface `past_due`
   * and `canceled` rows so the user can recover (fix card, reactivate).
   */
  listAvailableModules: orgProcedure.query(async ({ ctx }): Promise<ModuleListing[]> => {
    const rows = await ctx.db
      .select({
        moduleId: enabledModules.moduleId,
        status: enabledModules.status,
      })
      .from(enabledModules)
      .where(eq(enabledModules.organizationId, ctx.activeOrg.id));

    const dbByModule = new Map(rows.map((row) => [row.moduleId, row.status]));

    return listAvailableModules().map((mod): ModuleListing => {
      const base = {
        slug: mod.slug,
        name: mod.name,
        description: mod.description,
        monthlyPriceLabel: mod.monthlyPriceLabel,
      };

      if (mod.status === "coming_soon") {
        return { ...base, activationStatus: "coming_soon" };
      }
      const dbStatus = dbByModule.get(mod.slug);
      return {
        ...base,
        activationStatus: dbStatus ?? "inactive",
      };
    });
  }),

  /**
   * Creates a Stripe Checkout session for the given module's price.
   *
   * Flow:
   *   1. Validate the slug refers to an available module.
   *   2. Reject if the module is already active for the org (idempotency
   *      front — webhook is the source of truth, this is just UX).
   *   3. Reuse the org's Stripe Customer if any row already carries one;
   *      otherwise create a new Customer. The customer ID is NOT persisted
   *      yet — that happens in the `checkout.session.completed` webhook, so
   *      a user who abandons the checkout doesn't leave an orphan row.
   *   4. Open a subscription Checkout session with metadata duplicated on
   *      both the session AND the subscription. The latter is critical:
   *      `invoice.*` events carry `invoice.subscription`, so we read
   *      orgId/moduleSlug straight off the subscription metadata without
   *      re-fetching the checkout session.
   */
  createCheckoutSession: orgProcedure
    .input(
      z.object({
        moduleSlug: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const mod = getModule(input.moduleSlug);
      if (!mod || mod.status !== "available" || !mod.stripePriceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Module is not available for purchase",
        });
      }

      // Idempotency check (UX). The DB unique constraint on
      // (organization_id, module_id) is the real guard, enforced in the webhook.
      const existing = await ctx.db
        .select({ id: enabledModules.id })
        .from(enabledModules)
        .where(
          and(
            eq(enabledModules.organizationId, ctx.activeOrg.id),
            eq(enabledModules.moduleId, input.moduleSlug),
            eq(enabledModules.status, "active"),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Module is already active for this organization",
        });
      }

      const stripe = getStripeClient();
      const baseUrl = requireEnv("BETTER_AUTH_URL");

      // Reuse a customer if any module row of the org already has one. One
      // Stripe Customer per org — denormalised across rows for now.
      const customerRow = await ctx.db
        .select({ customerId: enabledModules.stripeCustomerId })
        .from(enabledModules)
        .where(
          and(
            eq(enabledModules.organizationId, ctx.activeOrg.id),
            isNotNull(enabledModules.stripeCustomerId),
          ),
        )
        .limit(1);

      let customerId = customerRow[0]?.customerId ?? null;
      if (!customerId) {
        const created = await stripe.customers.create({
          metadata: {
            orgId: ctx.activeOrg.id,
            orgSlug: ctx.activeOrg.slug,
            orgName: ctx.activeOrg.name,
          },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: mod.stripePriceId, quantity: 1 }],
        customer: customerId,
        success_url: `${baseUrl}/settings/billing?success=true`,
        cancel_url: `${baseUrl}/settings/billing?canceled=true`,
        metadata: {
          orgId: ctx.activeOrg.id,
          moduleSlug: input.moduleSlug,
        },
        subscription_data: {
          metadata: {
            orgId: ctx.activeOrg.id,
            moduleSlug: input.moduleSlug,
          },
        },
        allow_promotion_codes: true,
      });

      if (!session.url) {
        // Defensive — the API always returns a URL for hosted-mode sessions.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe Checkout session returned no URL",
        });
      }

      return { checkoutUrl: session.url };
    }),

  /**
   * Opens the Stripe Customer Portal for the active org. Requires an existing
   * customer (otherwise the portal has nothing to show) — surfaced as
   * FORBIDDEN with a stable string code so the UI can map it to a localized
   * message.
   */
  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
    const customerRow = await ctx.db
      .select({ customerId: enabledModules.stripeCustomerId })
      .from(enabledModules)
      .where(
        and(
          eq(enabledModules.organizationId, ctx.activeOrg.id),
          isNotNull(enabledModules.stripeCustomerId),
        ),
      )
      .limit(1);

    const customerId = customerRow[0]?.customerId;
    if (!customerId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "no_subscription",
      });
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${requireEnv("BETTER_AUTH_URL")}/settings/billing`,
    });

    return { portalUrl: session.url };
  }),
});
