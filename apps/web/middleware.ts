// apps/web/middleware.ts
//
// Lightweight session-cookie gate. `getSessionCookie` only inspects the cookie
// — no DB call, edge-safe. Real session validation still happens in route /
// page Server Components via `auth.api.getSession()`. This middleware is a
// fast-path redirect, not the security boundary.

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "@modulo/auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard"],
};
