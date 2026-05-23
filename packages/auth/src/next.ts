// packages/auth/src/next.ts
//
// Re-export of `better-auth/next-js`. Keeps `apps/web` dependent on
// `@modulo/auth` only — Better Auth itself stays an implementation detail of
// this package.

export { toNextJsHandler } from "better-auth/next-js";
