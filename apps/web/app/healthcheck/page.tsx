"use client";

// apps/web/app/healthcheck/page.tsx
//
// Smoke test page wiring the three `health.*` tRPC probes. Client Component
// because every probe is consumed via `useQuery` (real-time loading / error
// state, no SSR needed for a dev tool).
//
// Layout is intentionally sober: same surface tokens as /styleguide. All
// strings flow through next-intl. No hardcoded colors.

import { useTranslations } from "next-intl";

import { Card } from "@modulo/ui/components/card";

import { trpc } from "@/lib/trpc/client";

type ProcedureId = "ping" | "dbCheck" | "whoami";

interface ProbeViewProps {
  id: ProcedureId;
  status: "loading" | "success" | "error";
  latencyMs: number | null;
  payload: unknown;
}

function ProbeView({ id, status, latencyMs, payload }: ProbeViewProps) {
  const t = useTranslations("healthcheck");
  const name = t(`procedures.${id}.name`);
  const description = t(`procedures.${id}.description`);
  const stateLabel = t(`states.${status}`);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-mono text-md text-text-primary">{name}</h2>
          <p className="text-sm text-text-tertiary">{description}</p>
        </div>
        <ProbeBadge status={status} label={stateLabel} />
      </div>

      {latencyMs !== null ? (
        <p className="text-sm text-text-secondary">
          <span className="text-text-tertiary">{t("labels.latency")}: </span>
          <span className="font-mono">{latencyMs} ms</span>
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-2xs uppercase tracking-wide text-text-tertiary">
          {t("labels.payload")}
        </p>
        <pre className="overflow-x-auto rounded-md border border-border-subtle bg-surface-2 p-4 text-xs text-text-secondary">
          <code>{JSON.stringify(payload, null, 2)}</code>
        </pre>
      </div>
    </Card>
  );
}

function ProbeBadge({
  status,
  label,
}: {
  status: ProbeViewProps["status"];
  label: string;
}) {
  // Map status → token-driven class. No raw colors — every variant resolves
  // to a CSS variable via Tailwind utility.
  const className =
    status === "success"
      ? "bg-success/10 text-success"
      : status === "error"
        ? "bg-danger/10 text-danger"
        : "bg-surface-3 text-text-secondary";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-2xs font-medium uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

export default function HealthcheckPage() {
  const t = useTranslations("healthcheck");

  const pingQuery = trpc.health.ping.useQuery();
  const dbCheckQuery = trpc.health.dbCheck.useQuery();
  // `whoami` is expected to return UNAUTHORIZED when no session is present —
  // that's a valid signal, not a UI error.
  const whoamiQuery = trpc.health.whoami.useQuery(undefined, { retry: false });

  return (
    <main className="min-h-screen bg-surface-0 px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight text-text-primary">
            {t("title")}
          </h1>
          <p className="text-md text-text-secondary">{t("subtitle")}</p>
        </header>

        <div className="flex flex-col gap-4">
          <ProbeView
            id="ping"
            status={
              pingQuery.isPending
                ? "loading"
                : pingQuery.isError
                  ? "error"
                  : "success"
            }
            latencyMs={null}
            payload={pingQuery.data ?? pingQuery.error?.message ?? null}
          />

          <ProbeView
            id="dbCheck"
            status={
              dbCheckQuery.isPending
                ? "loading"
                : dbCheckQuery.isError
                  ? "error"
                  : dbCheckQuery.data.ok
                    ? "success"
                    : "error"
            }
            latencyMs={dbCheckQuery.data?.latencyMs ?? null}
            payload={dbCheckQuery.data ?? dbCheckQuery.error?.message ?? null}
          />

          <ProbeView
            id="whoami"
            status={
              whoamiQuery.isPending
                ? "loading"
                : whoamiQuery.isError
                  ? "error"
                  : "success"
            }
            latencyMs={null}
            payload={whoamiQuery.data ?? whoamiQuery.error?.message ?? null}
          />
        </div>
      </div>
    </main>
  );
}
