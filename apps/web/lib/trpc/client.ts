// apps/web/lib/trpc/client.ts
//
// React-Query–powered tRPC client. We import the `AppRouter` as a TYPE ONLY
// (`import type`) so TS erases the import at build time — no server code
// (Drizzle, Better Auth, the DB driver) ever leaks into the client bundle.
//
// `CreateTRPCReact` is re-exported with an explicit annotation: without it,
// TS infers a type that references a private `.d-*.mjs` file deep inside
// `@trpc/react-query`, breaking `declaration: true` builds (TS2742).

import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@modulo/api";

export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();
