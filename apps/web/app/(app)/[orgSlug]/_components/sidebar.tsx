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
import { LayoutDashboard, Package } from "lucide-react";

import { cn } from "@modulo/ui/lib/utils";

export interface SidebarModule {
  slug: string;
  name: string;
}

interface SidebarProps {
  orgSlug: string;
  modules: SidebarModule[];
  collapsed: boolean;
}

export function Sidebar({ orgSlug, modules, collapsed }: SidebarProps) {
  const t = useTranslations("app.sidebar");
  const pathname = usePathname();

  const dashboardHref = `/${orgSlug}/dashboard`;
  const isDashboardActive = pathname === dashboardHref;

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
              const href = `/${orgSlug}/m/${module.slug}`;
              const active = pathname.startsWith(href);
              return (
                <SidebarItem
                  key={module.slug}
                  href={href}
                  icon={<Package className="size-4" strokeWidth={1.5} />}
                  label={module.name}
                  active={active}
                  collapsed={collapsed}
                />
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
