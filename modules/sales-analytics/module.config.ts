// modules/sales-analytics/module.config.ts
//
// Static configuration for the "Sales Analytics" module. The registry in
// `packages/api/src/modules/registry.ts` is the source of truth for billing
// and availability; this file holds module-local metadata (icon, scopes, UI
// surface) consumed by the module itself and the shell.
//
// `ModuleConfig` is centralised since T1.3 in `@modulo/api/modules/types` —
// every module imports the same type so the shell consumes a single shape
// across the suite. Local re-declaration is no longer permitted.

import type { ModuleConfig } from "@modulo/api/modules/types";
import { requireEnv } from "@modulo/auth/env";

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
