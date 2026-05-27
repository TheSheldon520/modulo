"use client";

// apps/web/app/(app)/[orgSlug]/_components/user-menu.tsx
//
// Top-right user dropdown. Today: email + logout. Avatar / profile link /
// theme toggle will plug in later — the slot lives next to the sign-out item.

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@modulo/ui/components/dropdown-menu";

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  const t = useTranslations("app.topbar");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("userMenuAria")}
        >
          <UserRound className="size-4" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="truncate text-xs text-text-secondary">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={loading}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut className="size-4" strokeWidth={1.5} />
          <span>{loading ? t("logoutLoading") : t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
