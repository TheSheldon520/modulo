"use client";

// apps/web/app/(app)/dashboard/logout-button.tsx
//
// Client component carved out of the Server-Component dashboard so the
// sign-out interaction can run in the browser without forcing the whole page
// to ship to the client.

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";

export function LogoutButton() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={() => void handleLogout()}
      disabled={loading}
    >
      {loading ? t("logoutLoading") : t("logout")}
    </Button>
  );
}
