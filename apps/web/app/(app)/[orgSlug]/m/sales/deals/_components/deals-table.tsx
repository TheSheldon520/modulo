"use client";
// "use client" justification: uses tRPC useQuery (client data fetching)
// and renders loading skeleton / empty / error states that depend on
// query status — all inherently client-side concerns.

import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@modulo/ui/components/table";

import { trpc } from "@/lib/trpc/client";
import { formatDealAmount, getStageBadgeClasses } from "@/lib/deal-format";

// ---------------------------------------------------------------------------
// Skeleton (mimics the table layout — no centered spinner per design rules)
// ---------------------------------------------------------------------------

export function DealsTableSkeleton() {
  return (
    <div
      className="w-full overflow-x-auto rounded-lg border border-border-subtle"
      aria-busy="true"
      aria-label="Chargement des deals…"
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b [&_tr]:border-border-subtle">
          <tr>
            {["w-48", "w-28", "w-28", "w-28"].map((w, i) => (
              <th key={i} className="h-10 px-2 align-middle">
                <div className={`h-3 ${w} animate-pulse rounded bg-surface-3`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border-subtle">
              <td className="p-2 align-middle">
                <div className="h-3 w-40 animate-pulse rounded bg-surface-3" />
              </td>
              <td className="p-2 align-middle">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-3" />
              </td>
              <td className="p-2 align-middle">
                <div className="h-5 w-24 animate-pulse rounded-full bg-surface-3" />
              </td>
              <td className="p-2 align-middle">
                <div className="h-3 w-24 animate-pulse rounded bg-surface-3" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function DealsEmptyState() {
  const t = useTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
        <TrendingUp className="size-5 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">
          {t("empty.title")}
        </p>
        <p className="text-sm text-text-secondary">{t("empty.description")}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function DealsErrorState() {
  const t = useTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex items-center justify-center rounded-lg border border-border-subtle bg-surface-1 px-6 py-12">
      <p className="text-sm text-danger">{t("error.loadingFailed")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DealsTable() {
  const t = useTranslations("modules.salesAnalytics.deals");
  const { data: deals, status } = trpc.salesAnalytics.deals.list.useQuery();

  if (status === "pending") {
    return <DealsTableSkeleton />;
  }

  if (status === "error") {
    return <DealsErrorState />;
  }

  if (deals.length === 0) {
    return <DealsEmptyState />;
  }

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  });

  return (
    <div className="rounded-lg border border-border-subtle">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.name")}</TableHead>
            <TableHead className="text-right">{t("columns.amount")}</TableHead>
            <TableHead>{t("columns.stage")}</TableHead>
            <TableHead>{t("columns.createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell className="font-medium text-text-primary">
                {deal.name}
              </TableCell>
              <TableCell className="text-right font-mono text-text-primary">
                {formatDealAmount(deal.amount)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStageBadgeClasses(deal.stage)}`}
                >
                  {t(`stages.${deal.stage}`)}
                </span>
              </TableCell>
              <TableCell className="text-text-secondary">
                {dateFormatter.format(new Date(deal.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
