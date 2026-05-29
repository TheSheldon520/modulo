"use client";
// "use client" justification: receives data as props from parent Client
// Component (SalesOverviewView). Uses useTranslations hook (client i18n).

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@modulo/ui/components/table";

import { formatDealAmount, getStageBadgeClasses } from "@/lib/deal-format";

// ---------------------------------------------------------------------------
// Types — matches the recentDeals shape from overview.query output
// ---------------------------------------------------------------------------

interface RecentDeal {
  id: string;
  name: string;
  amount: string;
  stage: string;
  createdAt: Date;
}

interface RecentDealsTableProps {
  deals: RecentDeal[];
  orgSlug: string;
}

// ---------------------------------------------------------------------------
// RecentDealsTable
// ---------------------------------------------------------------------------

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function RecentDealsTable({ deals, orgSlug }: RecentDealsTableProps) {
  const t = useTranslations("modules.salesAnalytics");
  const tOverview = useTranslations("modules.salesAnalytics.overview");

  if (deals.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-tertiary">
        {tOverview("recentDeals.empty")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <p className="text-sm font-medium text-text-primary">
          {tOverview("recentDeals.title")}
        </p>
        <Link
          href={`/${orgSlug}/m/sales/deals`}
          className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {tOverview("recentDeals.viewAll")}
          <ArrowRight className="size-3" strokeWidth={1.5} />
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("deals.columns.name")}</TableHead>
            <TableHead className="text-right">{t("deals.columns.amount")}</TableHead>
            <TableHead>{t("deals.columns.stage")}</TableHead>
            <TableHead>{t("deals.columns.createdAt")}</TableHead>
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
                  {t(`deals.stages.${deal.stage}`)}
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
