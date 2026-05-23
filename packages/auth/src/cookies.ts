// packages/auth/src/cookies.ts
//
// Re-export of `better-auth/cookies`. Edge-safe helpers (no DB calls) used by
// the Next middleware to fast-path the redirect when no session cookie is
// present.

export { getSessionCookie } from "better-auth/cookies";
