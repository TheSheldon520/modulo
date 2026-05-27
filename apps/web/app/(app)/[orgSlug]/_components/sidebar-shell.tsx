"use client";

// apps/web/app/(app)/[orgSlug]/_components/sidebar-shell.tsx
//
// Client wrapper that owns the `collapsed` state for the sidebar rail and
// persists it across reloads via `localStorage`. Exposed pieces:
//
//   - The <Sidebar> rail itself (left column of the grid)
//   - The <Topbar> (top of the right column), which gets the toggle handler
//   - `children` (the actual page content, server-rendered)
//
// We do NOT lift this state into a context: the only consumers are direct
// siblings inside one layout, so prop drilling is both clearer and cheaper
// than a context provider rerendering everything on toggle.

import { useEffect, useState } from "react";

import type { OrgSummary } from "./topbar";
import { Sidebar, type SidebarModule } from "./sidebar";
import { Topbar } from "./topbar";

const STORAGE_KEY = "modulo:sidebar-collapsed";

interface SidebarShellProps {
  orgSlug: string;
  activeOrg: OrgSummary;
  modules: SidebarModule[];
  userEmail: string;
  children: React.ReactNode;
}

export function SidebarShell({
  orgSlug,
  activeOrg,
  modules,
  userEmail,
  children,
}: SidebarShellProps) {
  // Default `false` (expanded) so the initial server-matching render is
  // deterministic. We hydrate the persisted value once on the client. The
  // brief mismatch is hidden by the CSS `transition-[width]` which only kicks
  // in after the first user-driven toggle anyway.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      // localStorage may be disabled (private browsing, iframe sandbox). Fall
      // back to the default expanded state — no need to surface this.
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // See above. The in-memory state still flips; only persistence fails.
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-surface-0">
      <Sidebar orgSlug={orgSlug} modules={modules} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          activeOrg={activeOrg}
          userEmail={userEmail}
          collapsed={collapsed}
          onToggleSidebar={toggle}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
