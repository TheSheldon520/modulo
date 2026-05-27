"use client";

// apps/web/app/(app)/[orgSlug]/_components/org-cookie-resync.tsx
//
// Bridge component that pins the `modulo-active-org` cookie to the org id
// implied by the URL slug whenever the two disagree. Mounted by the
// tenant-scoped layout — see `actions.ts` in the same folder for the rationale.
//
// Renders nothing. The work happens once per slug change inside `useEffect`,
// fire-and-forget. We swallow errors silently: a transient cookie write
// failure isn't worth interrupting the render — the layout already validated
// membership server-side and `createTRPCContext` will catch up on the next
// tRPC call.

import { useEffect } from "react";

import { setActiveOrgCookie } from "../actions";

interface OrgCookieResyncProps {
  /** Org id the URL currently points to. */
  orgId: string;
  /** Org id the cookie holds. May equal `orgId` (no-op) or differ. */
  currentCookieOrgId: string | null;
}

export function OrgCookieResync({
  orgId,
  currentCookieOrgId,
}: OrgCookieResyncProps) {
  useEffect(() => {
    if (currentCookieOrgId === orgId) return;
    // Fire-and-forget. Server Action handles all the cookie attributes.
    void setActiveOrgCookie(orgId).catch(() => {
      // Best-effort: any failure here means the cookie still points at the
      // previous org. The next navigation will simply re-trigger the bridge.
    });
  }, [orgId, currentCookieOrgId]);

  return null;
}
