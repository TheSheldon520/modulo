import { notFound } from "next/navigation";

// apps/web/app/healthcheck/layout.tsx
//
// Dev-only guard for the /healthcheck route. The page itself is a Client
// Component (it consumes `health.*` tRPC probes via useQuery), so the gate is
// applied here at the Server Component layout level — it runs on the server
// before the client subtree is rendered. In any non-development environment
// (preview, staging, production) the page returns 404.
//
// Rationale: /healthcheck surfaces internal latency + the raw whoami tRPC
// payload, which must not be reachable outside local dev.

export default function HealthcheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return children;
}
