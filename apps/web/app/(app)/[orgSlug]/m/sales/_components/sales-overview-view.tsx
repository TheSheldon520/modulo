"use client";
// "use client" justification: owns period state (useState), uses
// trpc.salesAnalytics.overview.useQuery (client data fetching), and renders
// child Client Components (PeriodFilter, RevenueAreaChart, StageDonut,
// MetricCard with sparklines).

import { useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { MetricCard, MetricCardSkeleton } from "@modulo/ui/components/metric-card";

import { trpc } from "@/lib/trpc/client";
import {
  formatConversionRate,
  formatRevenueCompact,
  hasMeaningfulVariation,
} from "@/lib/sales-overview-format";
import type { Period } from "@modulo/sales-analytics/lib/period";

import { PeriodFilter } from "./period-filter";
import { RevenueAreaChart } from "./charts/revenue-area-chart";
import { StageDonut } from "./charts/stage-donut";
import { RecentDealsTable } from "./recent-deals-table";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SalesOverviewViewProps {
  orgSlug: string;
}

// ---------------------------------------------------------------------------
// Skeleton for the full dashboard
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="flex gap-4">
        <div className="h-72 flex-[2] animate-pulse rounded-lg border border-border-subtle bg-surface-3" />
        <div className="h-72 flex-1 animate-pulse rounded-lg border border-border-subtle bg-surface-3" />
      </div>
      {/* Table skeleton */}
      <div className="h-48 animate-pulse rounded-lg border border-border-subtle bg-surface-3" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function DashboardEmpty({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("modules.salesAnalytics.overview");

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl border border-border-subtle bg-surface-2">
        <TrendingUp className="size-6 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">
          {t("empty.title")}
        </p>
        <p className="text-sm text-text-secondary">{t("empty.description")}</p>
      </div>
      <Link
        href={`/${orgSlug}/m/sales/deals`}
        className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("empty.cta")}
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function DashboardError() {
  const t = useTranslations("modules.salesAnalytics.overview");

  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border-subtle bg-surface-1 px-6">
      <p className="text-sm text-danger">{t("error.loadingFailed")}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {title ? (
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// SalesOverviewView
// ---------------------------------------------------------------------------

export function SalesOverviewView({ orgSlug }: SalesOverviewViewProps) {
  const [period, setPeriod] = useState<Period>("90d");
  const t = useTranslations("modules.salesAnalytics.overview");
  const tDeals = useTranslations("modules.salesAnalytics.deals");

  const { data, status, isFetching } = trpc.salesAnalytics.overview.query.useQuery({
    period,
  });

  // ----- Loading (initial) -----
  if (status === "pending") {
    return (
      <div className="flex flex-col gap-0">
        {/* Header with filter still visible while loading */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h1 className="text-base font-semibold tracking-tight text-text-primary">
            {t("title")}
          </h1>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // ----- Error -----
  if (status === "error") {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h1 className="text-base font-semibold tracking-tight text-text-primary">
            {t("title")}
          </h1>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="p-6">
          <DashboardError />
        </div>
      </div>
    );
  }

  const { kpis, variations, sparklines, revenueByMonth, stageDistribution, recentDeals } = data;

  // Empty state: all KPIs at 0, no recent deals
  const isEmpty =
    kpis.revenue === 0 &&
    kpis.wonCount === 0 &&
    kpis.pipelineValue === 0 &&
    recentDeals.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h1 className="text-base font-semibold tracking-tight text-text-primary">
            {t("title")}
          </h1>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
        <div className="p-6">
          <DashboardEmpty orgSlug={orgSlug} />
        </div>
      </div>
    );
  }

  // ----- Populated dashboard -----
  const opacity = isFetching && status === "success" ? "opacity-70" : "opacity-100";

  const conversionValue =
    kpis.conversionRate !== null
      ? formatConversionRate(kpis.conversionRate)
      : t("kpis.conversionRate.nullPlaceholder");

  // Resolves a stage key to its i18n label via an exhaustive lookup so we
  // don't need a dynamic string cast that would violate the no-any rule.
  const STAGE_LABEL_KEYS = {
    lead: "stages.lead",
    qualified: "stages.qualified",
    proposal: "stages.proposal",
    won: "stages.won",
    lost: "stages.lost",
  } as const satisfies Record<string, Parameters<typeof tDeals>[0]>;

  const getStageLabelFn = (stage: string): string => {
    const key = STAGE_LABEL_KEYS[stage as keyof typeof STAGE_LABEL_KEYS];
    return key ? tDeals(key) : stage;
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <h1 className="text-base font-semibold tracking-tight text-text-primary">
          {t("title")}
        </h1>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Dashboard body */}
      <div className={`flex flex-col gap-6 p-6 transition-opacity duration-200 ${opacity}`}>

        {/* KPI cards */}
        <Section>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label={t("kpis.revenue.label")}
              value={formatRevenueCompact(kpis.revenue)}
              variation={variations.revenue}
              neutralLabel={t("variation.neutral")}
              // Recharts happily draws a flat line + gradient fill on constant
              // series — visually a coloured stripe at the card bottom,
              // indistinguishable from a placeholder. `hasMeaningfulVariation`
              // hides the sparkline entirely in that case so the KPI grid stays
              // visually consistent (value-only rendering instead of "stripe").
              sparkline={
                hasMeaningfulVariation(sparklines.revenue)
                  ? sparklines.revenue
                  : undefined
              }
              sparklineColor={1}
            />
            <MetricCard
              label={t("kpis.wonCount.label")}
              value={String(kpis.wonCount)}
              variation={variations.wonCount}
              neutralLabel={t("variation.neutral")}
              sparkline={
                hasMeaningfulVariation(sparklines.wonCount)
                  ? sparklines.wonCount
                  : undefined
              }
              sparklineColor={2}
            />
            <MetricCard
              label={t("kpis.conversionRate.label")}
              value={conversionValue}
              variation={
                kpis.conversionRate !== null ? variations.conversionRate : null
              }
              neutralLabel={t("variation.neutral")}
            />
            <MetricCard
              label={t("kpis.pipelineValue.label")}
              value={formatRevenueCompact(kpis.pipelineValue)}
              // Pipeline value has no historical snapshots yet — `variations.pipelineValue`
              // would compare the current value to itself (always 0 delta). We render
              // it without a variation row until T1.5+ ships a deal-state event log.
              variation={null}
              neutralLabel={t("variation.neutral")}
              sparklineColor={3}
            />
          </div>
        </Section>

        {/* Charts row */}
        <Section>
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Revenue area chart — takes 2/3 width on large screens */}
            <div className="flex-[2] rounded-lg border border-border-subtle bg-surface-1 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                {t("charts.revenue.title")}
              </p>
              <RevenueAreaChart data={revenueByMonth} />
            </div>

            {/* Stage donut — takes 1/3 width on large screens */}
            <div className="flex-1 rounded-lg border border-border-subtle bg-surface-1 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
                {t("charts.stages.title")}
              </p>
              <div className="h-[280px]">
                <StageDonut
                  data={stageDistribution}
                  getStageLabelFn={getStageLabelFn}
                  emptyLabel={t("charts.stages.empty")}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Recent deals */}
        <Section>
          <RecentDealsTable deals={recentDeals} orgSlug={orgSlug} />
        </Section>
      </div>
    </div>
  );
}
