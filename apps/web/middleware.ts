// apps/web/middleware.ts
//
// Lightweight cookie-only gate. Two cookies inspected, zero DB calls (edge
// runtime). The real security boundary is `auth.api.getSession()` in Server
// Components + `createTRPCContext` for tRPC — the middleware only does
// fast-path UX redirects.
//
// Rules:
//
//   /login, /signup        with session            → /
//                          without session         → 200 (form)
//   /onboarding/*          without session         → /login
//                          with session + no org   → 200 (form)
//                          with session + active   → /
//   /settings/*            without session         → /login
//                          with session + no org   → /onboarding/create-org
//                          with session + active   → 200 (page)
//   /:orgSlug/dashboard/*  without session         → /login
//                          with session + no org   → /onboarding/create-org
//                          with session + active   → 200 (page)
//   /:orgSlug/m/*          same as above
//
// `/` is intentionally NOT in the matcher: the landing page renders publicly
// for anonymous users and the Server Component does its own session-aware
// redirect when a session exists (resolves the active org slug from the DB,
// which the edge middleware cannot do without spawning a connection).
//
// `/api/webhooks/stripe` is intentionally OUTSIDE the matcher — Stripe calls
// it server-to-server with no cookies and its own signature verification.
//
// `ACTIVE_ORG_COOKIE` is duplicated as a string literal here on purpose: the
// middleware bundle must stay free of any server-only import (no
// `@modulo/api`, no Drizzle). The constant is small and stable.

import { NextResponse, type NextRequest } from "next/server";

import { getSessionCookie } from "@modulo/auth/cookies";

const ACTIVE_ORG_COOKIE = "modulo-active-org";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const hasActiveOrg = Boolean(request.cookies.get(ACTIVE_ORG_COOKIE)?.value);

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isSettingsRoute = pathname.startsWith("/settings");

  // A tenant-scoped route is `/<slug>/dashboard/*` or `/<slug>/m/*`. The
  // matcher already restricts what reaches this function — we re-check
  // explicitly so the routing logic below stays self-documenting.
  const segments = pathname.split("/").filter(Boolean);
  const isTenantRoute =
    segments.length >= 2 &&
    (segments[1] === "dashboard" || segments[1] === "m");

  const isProtectedRoute = isTenantRoute || isSettingsRoute;

  // 1. Logged-in users shouldn't see the login / signup forms. We send them to
  //    `/`, which is itself a Server Component that resolves the active org
  //    slug and forwards to `/<slug>/dashboard`. Bouncing to `/` (rather than
  //    a hardcoded slug we don't know) keeps the middleware DB-free.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Protected routes require a session cookie.
  if ((isOnboardingRoute || isProtectedRoute) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. With a session, route based on whether the user has an active org.
  if (isProtectedRoute && hasSession && !hasActiveOrg) {
    return NextResponse.redirect(
      new URL("/onboarding/create-org", request.url),
    );
  }

  if (isOnboardingRoute && hasSession && hasActiveOrg) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/onboarding/:path*",
    "/settings/:path*",
    "/:orgSlug/dashboard/:path*",
    "/:orgSlug/m/:path*",
  ],
};
