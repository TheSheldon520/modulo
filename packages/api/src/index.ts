// packages/api/src/index.ts
//
// Public surface of `@modulo/api`.
//
// On the server, consumers import:
//   - `appRouter` (value) to mount the tRPC handler
//   - `createTRPCContext` (value) to build the per-request context
//   - `publicProcedure` / `authedProcedure` / `orgProcedure` / `moduleProcedure`
//     to define their own sub-routers
//
// On the client (`apps/web/lib/trpc/client.ts`), consumers MUST `import type
// { AppRouter }` only. Because TypeScript erases pure type imports, no server
// code (Drizzle, Better Auth, the DB driver) is ever bundled client-side.

export { appRouter, type AppRouter } from "./router";
export { createTRPCContext, type Context, type ActiveOrg, type ContextUser } from "./trpc";
export { router, middleware, createCallerFactory } from "./trpc";
export {
  publicProcedure,
  authedProcedure,
  orgProcedure,
  moduleProcedure,
} from "./procedures";
