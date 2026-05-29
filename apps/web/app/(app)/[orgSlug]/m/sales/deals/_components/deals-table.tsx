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
import type { DealRow } from "./deal-card";

// ---------------------------------------------------------------------------
// Skeleton (mimics the table layout — no centered spinner per design rules)
// ---------------------------------------------------------------------------

export function DealsTableSkeleton() {
  const t = useTranslations("modules.salesAnalytics.deals");
  return (
    <div
      className="w-full overflow-x-auto rounded-lg border border-border-subtle"
      aria-busy="true"
      aria-label={t("table.loading")}
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
// Props
// ---------------------------------------------------------------------------

interface DealsTableProps {
  /**
   * The filtered deal list from DealsView. `undefined` = loading.
   * Global empty state (no deals at all) is shown when the array is empty
   * AND no filters are active. The "filtered empty" case is handled upstream
   * by DealsView (which never renders DealsTable in that scenario).
   */
  filteredDeals: DealRow[] | undefined;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DealsTable({ filteredDeals }: DealsTableProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  // Still subscribe to the query for the error status — filteredDeals are
  // passed in pre-filtered from DealsView, but we need the raw status to
  // distinguish "loading" from "empty + filtered".
  const { status } = trpc.salesAnalytics.deals.list.useQuery();

  if (status === "pending" || filteredDeals === undefined) {
    return <DealsTableSkeleton />;
  }

  if (status === "error") {
    return <DealsErrorState />;
  }

  if (filteredDeals.length === 0) {
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
          {filteredDeals.map((deal) => (
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
