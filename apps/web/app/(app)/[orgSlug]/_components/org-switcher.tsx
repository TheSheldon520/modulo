"use client";

// apps/web/app/(app)/[orgSlug]/_components/org-switcher.tsx
//
// Dropdown that lists every org the current user is a member of and routes to
// `/<newSlug>/dashboard` on pick. The list comes from `organizations.list`,
// which mirrors the deterministic order used by `createTRPCContext` (oldest
// membership first) so the UI ordering matches the server-side fallback.
//
// The cookie resync is handled separately by `<OrgCookieResync>` (mounted in
// the layout). We don't pre-set it here because the navigation already drives
// a fresh layout render with the new slug, which triggers the bridge.

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@modulo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@modulo/ui/components/dropdown-menu";

import { trpc } from "@/lib/trpc/client";

import type { OrgSummary } from "./topbar";

interface OrgSwitcherProps {
  activeOrg: OrgSummary;
}

export function OrgSwitcher({ activeOrg }: OrgSwitcherProps) {
  const t = useTranslations("app.topbar");
  const router = useRouter();
  const { data: orgs, isLoading } = trpc.organizations.list.useQuery();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={t("orgSwitcherAria", { name: activeOrg.name })}
        >
          <span className="truncate font-medium text-text-primary">
            {activeOrg.name}
          </span>
          <ChevronsUpDown className="size-3 text-text-secondary" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>{t("orgSwitcherLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && !orgs ? (
          <DropdownMenuItem disabled>{t("loading")}</DropdownMenuItem>
        ) : null}
        {orgs?.map((org) => {
          const isActive = org.id === activeOrg.id;
          return (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => {
                if (isActive) return;
                router.push(`/${org.slug}/dashboard`);
              }}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{org.name}</span>
              {isActive ? (
                <Check className="size-3.5 text-text-secondary" strokeWidth={1.5} />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
