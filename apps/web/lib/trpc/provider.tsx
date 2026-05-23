"use client";

// apps/web/lib/trpc/provider.tsx
//
// Wraps the tree with React-Query + tRPC. Mounted once in the root layout
// inside `NextIntlClientProvider`. Both clients live in `useState` so HMR
// doesn't spin up a new QueryClient (and lose cache) on every render.
//
// `superjson` is configured on the link to mirror the server-side transformer
// in `@modulo/api` — Date/Map/Set/BigInt survive the boundary in both
// directions.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
