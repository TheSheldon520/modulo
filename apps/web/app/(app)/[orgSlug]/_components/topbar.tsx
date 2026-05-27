"use client";

// apps/web/app/(app)/[orgSlug]/_components/topbar.tsx
//
// Top chrome of the tenant shell. Three responsibilities:
//   1. Sidebar collapse toggle (delegated by `<SidebarShell>`)
//   2. Org switcher (lists all the user's orgs, navigates on pick)
//   3. User menu (avatar / email / sign out)
//
// Kept thin — every piece of business logic lives in the sub-components so
// each can be tested / reordered independently.

import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeft } from "lucide-react";

import { Button } from "@modulo/ui/components/button";

import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
}

interface TopbarProps {
  activeOrg: OrgSummary;
  userEmail: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({
  activeOrg,
  userEmail,
  collapsed,
  onToggleSidebar,
}: TopbarProps) {
  const t = useTranslations("app.topbar");

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface-1 px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
      >
        {collapsed ? (
          <PanelLeft className="size-4" strokeWidth={1.5} />
        ) : (
          <PanelLeftClose className="size-4" strokeWidth={1.5} />
        )}
      </Button>

      <OrgSwitcher activeOrg={activeOrg} />

      <div className="ml-auto">
        <UserMenu email={userEmail} />
      </div>
    </header>
  );
}
