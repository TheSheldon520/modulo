// packages/api/src/modules/types.ts
//
// Centralised module-config types. Imported by every module's
// `module.config.ts` so the shell (sidebar, command palette, settings pages)
// consumes a single shape and module authors stop redeclaring it.
//
// Introduced in T1.3 — until T1.2 every freshly scaffolded module copied
// these interfaces locally. The contract is unchanged; only the home moved.
// Subsequent enrichments (e.g. command-palette entries, settings panels) land
// here and propagate to every module without touching scaffolding.

/**
 * Sidebar / nav item declared by a module. The shell resolves the `icon`
 * string to a Lucide component at the call site, so this type stays free of
 * React imports and remains safe to import from server contexts.
 */
export interface NavigationItem {
  label: string;
  href: string;
  /** Lucide icon name. The shell resolves string → Component at the call site. */
  icon: string;
  adminOnly?: boolean;
}

/**
 * Default role → scopes mapping. Tenants may override the mapping later via
 * the org settings UI; this is the seed surface the module ships with.
 */
export interface RolePermissions {
  owner: readonly string[];
  admin: readonly string[];
  member: readonly string[];
  viewer: readonly string[];
}

/**
 * Module-local metadata. The registry in
 * `packages/api/src/modules/registry.ts` remains the source of truth for
 * billing availability — this type covers everything the module itself owns
 * (icon, scopes, nav surface, default permissions).
 */
export interface ModuleConfig {
  id: string;
  /** URL slug — may differ from `id` (shorter for routes if desired). */
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
