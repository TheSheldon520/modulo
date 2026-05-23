// apps/web/app/api/trpc/[trpc]/route.ts
//
// tRPC v11 fetch adapter mounted on Next's App Router. The dynamic segment is
// a single `[trpc]` (the procedure path is encoded as `/api/trpc/<router>.<proc>`,
// no nested segments needed).
//
// Per-request flow:
//   1. Build a fresh `resHeaders` collector.
//   2. `createTRPCContext` may append `Set-Cookie` to it (e.g. active-org
//      bootstrap).
//   3. `responseMeta` returns those headers so the fetch adapter merges them
//      into the outgoing response.

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@modulo/api";

function handler(req: Request) {
  const resHeaders = new Headers();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req, resHeaders }),
    responseMeta: () => ({ headers: resHeaders }),
  });
}

export { handler as GET, handler as POST };
