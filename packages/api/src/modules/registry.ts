// packages/api/src/modules/registry.ts
//
// Static module registry — single source of truth for module metadata
// (slug, display name, Stripe price, availability). Lives intra-package for
// T0.9; will move to a dedicated `@modulo/modules` package in Phase 1 once
// we have more than two modules.
//
// `requireEnv` for `STRIPE_PRICE_*` is invoked **lazily** through a getter on
// `stripePriceId`: code paths that never touch billing (e.g. `health.ping`)
// must not crash the whole process when the var is missing. Boot still fails
// loud the first time the price is actually read — which is precisely when
// `billing.createCheckoutSession` needs it — but stays silent everywhere else.
// This mirrors the lazy pattern used by `STRIPE_WEBHOOK_SECRET` in the webhook
// route.

import { requireEnv } from "@modulo/auth/env";

export interface ModuleDescriptor {
  slug: string;
  name: string;
  description: string;
  /**
   * Null when the module is `coming_soon` — no Stripe product yet. For
   * `available` modules this is a **lazy getter** backed by `requireEnv`; the
   * `STRIPE_PRICE_*` env var is read on access, not at module load.
   */
  readonly stripePriceId: string | null;
  status: "available" | "coming_soon";
  /**
   * UI display label for the monthly price. T0.9 hardcodes this; Phase 1 will
   * fetch the actual amount from Stripe at request time (with cache) so we
   * stay in sync with price changes made in the dashboard.
   */
  monthlyPriceLabel?: string;
}

export const MODULES = {
  "sales-analytics": {
    slug: "sales-analytics",
    name: "Sales Analytics",
    description:
      "Tableau de bord d'analyse commerciale temps réel pour les équipes de vente B2B.",
    // Lazy: `requireEnv` only fires on access, so missing env vars don't
    // crash the process at import time. The error still surfaces clearly
    // at the first checkout attempt.
    get stripePriceId(): string {
      return requireEnv("STRIPE_PRICE_SALES_ANALYTICS");
    },
    status: "available",
    monthlyPriceLabel: "29€/mois",
  },
  crm: {
    slug: "crm",
    name: "CRM",
    description: "Gestion de la relation client.",
    stripePriceId: null,
    status: "coming_soon",
  },
} as const satisfies Record<string, ModuleDescriptor>;

export type ModuleSlug = keyof typeof MODULES;

/** Lookup by slug. Returns `undefined` for unknown slugs (don't throw — callers
 *  validate user input and map to a TRPC error themselves). */
export function getModule(slug: string): ModuleDescriptor | undefined {
  return MODULES[slug as ModuleSlug];
}

/** Lists every registered module, available and coming-soon alike. UI is in
 *  charge of filtering / sorting. */
export function listAvailableModules(): ModuleDescriptor[] {
  return Object.values(MODULES);
}
