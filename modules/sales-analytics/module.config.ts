// modules/sales-analytics/module.config.ts
//
// Static configuration for the "Sales Analytics" module. The registry in
// `packages/api/src/modules/registry.ts` is the source of truth for billing
// and availability; this file holds module-local metadata (icon, scopes, UI
// surface) consumed by the module itself and the shell.
//
// `ModuleConfig` is declared locally for T1.2 — every freshly scaffolded
// module ships its own copy. T1.3+ will centralise the type once the shell
// starts consuming it (sidebar sub-items, command palette commands, settings
// pages). At that point the local type moves to (likely) `@modulo/api/modules`
// and modules import it instead of redeclaring.

import { requireEnv } from "@modulo/auth/env";

interface NavigationItem {
  label: string;
  href: string;
  /** Lucide icon name. The shell resolves string → Component at the call site. */
  icon: string;
  adminOnly?: boolean;
}

interface RolePermissions {
  owner: readonly string[];
  admin: readonly string[];
  member: readonly string[];
  viewer: readonly string[];
}

interface ModuleConfig {
  id: string;
  /** URL slug — may differ from `id` (e.g. shorter for routes: `sales` vs `sales-analytics`). */
  slug: string;
  /** Full display name shown in billing, settings, marketing. */
  name: string;
  /** Compact name shown in tight surfaces (sidebar, breadcrumbs, kbd menus). */
  shortName: string;
  /** One-sentence pitch — used in `/settings/billing` and marketing. */
  description: string;
  /** Top-level category for grouping in module catalogues. */
  category: "productivity" | "data" | "ai" | "communication";
  /** Lucide icon name. Shell-side string → Component resolution. */
  icon: string;
  /**
   * Stripe price ID — lazy getter, same pattern as the registry. Reading it
   * throws iff the env var is missing, which only matters at checkout time.
   */
  readonly stripePriceId: string;
  monthlyPriceLabel: string;
  /** Permission scopes scoped to this module. Short prefix is intentional. */
  scopes: readonly string[];
  /** Sidebar / nav items the shell renders when the module is enabled. */
  navigation: readonly NavigationItem[];
  /** Default role → scopes mapping. Tenants may override later. */
  defaultRolePermissions: RolePermissions;
}

export const salesAnalyticsConfig = {
  id: "sales-analytics",
  slug: "sales",
  name: "Sales Analytics",
  shortName: "Sales",
  description: "Pilotage commercial et KPI temps réel",
  category: "data",
  icon: "BarChart3",
  get stripePriceId(): string {
    return requireEnv("STRIPE_PRICE_SALES_ANALYTICS");
  },
  monthlyPriceLabel: "29€/mois",
  scopes: ["sales:read", "sales:write", "sales:admin"],
  navigation: [
    { label: "Vue d'ensemble", href: "/m/sales", icon: "LayoutDashboard" },
    { label: "Deals", href: "/m/sales/deals", icon: "Briefcase" },
    { label: "Performance", href: "/m/sales/performance", icon: "TrendingUp" },
    {
      label: "Paramètres",
      href: "/m/sales/settings",
      icon: "Settings",
      adminOnly: true,
    },
  ],
  defaultRolePermissions: {
    owner: ["sales:read", "sales:write", "sales:admin"],
    admin: ["sales:read", "sales:write", "sales:admin"],
    member: ["sales:read", "sales:write"],
    viewer: ["sales:read"],
  },
} as const satisfies ModuleConfig;

export type SalesAnalyticsScope =
  (typeof salesAnalyticsConfig.scopes)[number];
