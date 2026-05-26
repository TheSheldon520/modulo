// apps/web/middleware.ts
//
// Lightweight cookie-only gate. Two cookies inspected, zero DB calls (edge
// runtime). The real security boundary is `auth.api.getSession()` in Server
// Components + `createTRPCContext` for tRPC — the middleware only does
// fast-path UX redirects.
//
// Rules:
//
//   /login, /signup        with session            → /dashboard
//                          without session         → 200 (form)
//   /onboarding/*          without session         → /login
//                          with session + no org   → 200 (form)
//                          with session + active   → /dashboard
//   /dashboard/*           without session         → /login
//                          with session + no org   → /onboarding/create-org
//                          with session + active   → 200 (page)
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
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // 1. Logged-in users shouldn't see the login / signup forms.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 2. Protected routes require a session cookie.
  if ((isOnboardingRoute || isDashboardRoute) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. With a session, route based on whether the user has an active org.
  if (isDashboardRoute && hasSession && !hasActiveOrg) {
    return NextResponse.redirect(
      new URL("/onboarding/create-org", request.url),
    );
  }

  if (isOnboardingRoute && hasSession && hasActiveOrg) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/onboarding/:path*",
  ],
};
