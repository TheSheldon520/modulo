"use client";

// apps/web/app/(app)/[orgSlug]/_components/sidebar.tsx
//
// Tenant sidebar — Dashboard entry + one row per active module. The list of
// active modules is computed server-side by the layout and threaded through
// as props (no client-side data fetching for navigation chrome — keeps the
// initial paint deterministic and free of skeletons on the most-rendered
// surface of the app).
//
// `collapsed` is owned by the parent `<SidebarShell>` (which persists it to
// `localStorage` once mounted) so both the rail and the topbar trigger can
// react to the same source of truth. The toggle itself lives in the topbar
// (see `topbar.tsx`).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  LayoutDashboard,
  Package,
  Settings,
  TrendingUp,
} from "lucide-react";

import { cn } from "@modulo/ui/lib/utils";
import type { NavigationItem } from "@modulo/api/modules/types";

// ---------------------------------------------------------------------------
// Lucide icon resolver
// ---------------------------------------------------------------------------

// Maps icon name strings from module.config.ts to Lucide components.
// Only icons used in navigation items need to be listed here.
const LUCIDE_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number }>> = {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Settings,
  Package,
};

function resolveIcon(
  iconName: string,
): React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number }> {
  return LUCIDE_ICONS[iconName] ?? Package;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SidebarModule {
  slug: string;
  name: string;
  /** Navigation sub-items from module.config.ts. Empty array = no sub-items. */
  navigation: NavigationItem[];
}

/** User role within the active org — used to filter adminOnly nav items. */
export type OrgRole = "owner" | "admin" | "member" | "viewer";

interface SidebarProps {
  orgSlug: string;
  modules: SidebarModule[];
  collapsed: boolean;
  /** Role of the current user in the active org. */
  userRole: OrgRole;
}

const ADMIN_ROLES: OrgRole[] = ["owner", "admin"];

export function Sidebar({ orgSlug, modules, collapsed, userRole }: SidebarProps) {
  const t = useTranslations("app.sidebar");
  const pathname = usePathname();

  const dashboardHref = `/${orgSlug}/dashboard`;
  const isDashboardActive = pathname === dashboardHref;
  const isAdminOrOwner = ADMIN_ROLES.includes(userRole);

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border-subtle bg-surface-1 transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
      aria-label={t("ariaLabel")}
    >
      <div className="flex h-14 items-center border-b border-border-subtle px-4">
        <Link
          href={dashboardHref}
          className="rounded text-md font-medium tracking-tight text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {collapsed ? "M" : "Modulo"}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <SidebarItem
          href={dashboardHref}
          icon={<LayoutDashboard className="size-4" strokeWidth={1.5} />}
          label={t("dashboard")}
          active={isDashboardActive}
          collapsed={collapsed}
        />

        {modules.length > 0 ? (
          <>
            <div
              className={cn(
                "mt-4 px-2 pb-2 text-xs uppercase tracking-wider text-text-tertiary",
                collapsed && "sr-only",
              )}
            >
              {t("modulesSection")}
            </div>
            {modules.map((module) => {
              const moduleHref = `/${orgSlug}/m/${module.slug}`;
              const isModuleActive = pathname.startsWith(moduleHref);

              // Filter navigation items: exclude adminOnly items for non-admins
              const visibleNavItems = module.navigation.filter(
                (item) => !item.adminOnly || isAdminOrOwner,
              );

              return (
                <div key={module.slug}>
                  {/* Module parent item */}
                  <SidebarItem
                    href={moduleHref}
                    icon={<Package className="size-4" strokeWidth={1.5} />}
                    label={module.name}
                    active={isModuleActive && visibleNavItems.length === 0}
                    collapsed={collapsed}
                  />

                  {/* Sub-items (hidden when collapsed) */}
                  {visibleNavItems.length > 0 && !collapsed && (
                    <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-border-subtle pl-3">
                      {visibleNavItems.map((item) => {
                        const fullHref = `/${orgSlug}${item.href}`;
                        // Active if exact match or pathname starts with the href
                        // (handles nested routes like /m/sales/deals/123)
                        const isActive =
                          pathname === fullHref ||
                          pathname.startsWith(fullHref + "/");
                        const IconComponent = resolveIcon(item.icon);

                        return (
                          <Link
                            key={item.href}
                            href={fullHref}
                            className={cn(
                              "flex h-7 items-center gap-2 rounded px-2 text-xs transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                              isActive
                                ? "bg-surface-3 text-text-primary"
                                : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                            )}
                          >
                            <IconComponent
                              className="size-3 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <p
            className={cn(
              "mt-4 px-2 text-xs text-text-tertiary",
              collapsed && "sr-only",
            )}
          >
            {t("noModules")}
          </p>
        )}
      </nav>
    </aside>
  );
}

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({
  href,
  icon,
  label,
  active,
  collapsed,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-2 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-surface-3 text-text-primary"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}
