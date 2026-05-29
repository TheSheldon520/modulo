"use client";
// "use client" justification: uses Recharts (AreaChart / ResponsiveContainer)
// which relies on browser APIs (ResizeObserver, DOM measurements) and cannot
// run in a Server Component context. Lucide icons are tree-shakable client-side.
// Callers that import <MetricCard> must be Client Components or wrap it in a
// "use client" boundary.

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

import { cn } from "@modulo/ui/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricCardVariation {
  delta: number;
  percentage: number | null;
}

export interface MetricCardSparklinePoint {
  x: string;
  y: number;
}

export interface MetricCardProps {
  /** Displayed as card title — caller controls i18n. */
  label: string;
  /** Main value, already formatted as a string — caller controls format (currency, %, count). */
  value: string;
  /** Variation vs previous period. Null hides the variation row entirely. */
  variation?: MetricCardVariation | null;
  /**
   * Label rendered in place of a percentage when the comparison can't produce
   * a meaningful ratio — either `delta === 0` (truly stable) OR
   * `percentage === null` (previous period had no data, so a ratio is
   * undefined). Caller controls the wording via i18n (typical: "—", "Stable",
   * "Nouveau"). Defaults to "—" — a universally-understood neutral marker.
   */
  neutralLabel?: string;
  /** Sparkline data points. Empty or absent → no sparkline rendered. */
  sparkline?: MetricCardSparklinePoint[];
  /** Sparkline color via chart token (1–5). Defaults to 1. */
  sparklineColor?: 1 | 2 | 3 | 4 | 5;
  /** Loading skeleton state. */
  isLoading?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-full rounded-lg border border-border-subtle bg-surface-1 p-4",
        className,
      )}
      aria-busy="true"
      aria-label="Chargement du KPI…"
    >
      {/* label */}
      <div className="h-3 w-28 animate-pulse rounded bg-surface-3" />
      {/* value */}
      <div className="mt-3 h-7 w-36 animate-pulse rounded bg-surface-3" />
      {/* variation */}
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-3" />
      {/* sparkline */}
      <div className="mt-4 h-10 w-full animate-pulse rounded bg-surface-3" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variation row helpers
// ---------------------------------------------------------------------------

function VariationRow({
  variation,
  neutralLabel,
}: {
  variation: MetricCardVariation;
  neutralLabel: string;
}) {
  const { delta, percentage } = variation;

  // Two neutral cases collapsed onto the same rendering:
  //   - `delta === 0`            → truly stable.
  //   - `percentage === null`    → previous period had no data (e.g. YTD on a
  //                                fresh org), so a ratio would be undefined.
  // In both cases we render `neutralLabel` (typically "—" or "Nouveau") instead
  // of a raw signed integer, which would be misleading on percentage-labelled
  // KPIs (e.g. "+64" on a conversion-rate card).
  if (delta === 0 || percentage === null) {
    return (
      <div className="flex items-center gap-1 text-xs text-text-tertiary">
        <Minus className="size-3 shrink-0" strokeWidth={1.5} />
        <span>{neutralLabel}</span>
      </div>
    );
  }

  const isPositive = delta > 0;
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const colorClass = isPositive ? "text-success" : "text-danger";
  const pctLabel = `${Math.abs(percentage).toFixed(1)} %`;

  return (
    <div className={cn("flex items-center gap-1 text-xs", colorClass)}>
      <Icon className="size-3 shrink-0" strokeWidth={1.5} />
      <span>{pctLabel}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export function MetricCard({
  label,
  value,
  variation,
  neutralLabel = "—",
  sparkline,
  sparklineColor = 1,
  isLoading = false,
  className,
}: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton className={className} />;
  }

  const hasSparkline = sparkline && sparkline.length > 0;
  const colorVar = `var(--color-chart-${sparklineColor})`;

  return (
    <div
      className={cn(
        // `h-full` so cards stretch to the tallest sibling inside a CSS grid
        // row — keeps the KPI grid visually flat when some cards render a
        // sparkline and others don't.
        "h-full rounded-lg border border-border-subtle bg-surface-1 p-4",
        className,
      )}
    >
      {/* Label */}
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </p>

      {/* Main value */}
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </p>

      {/* Variation */}
      {variation != null ? (
        <div className="mt-1">
          <VariationRow variation={variation} neutralLabel={neutralLabel} />
        </div>
      ) : null}

      {/* Sparkline */}
      {hasSparkline ? (
        <div className="mt-3 h-10 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkline}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`sparkGrad${sparklineColor}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={colorVar} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colorVar} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={colorVar}
                strokeWidth={1.5}
                fill={`url(#sparkGrad${sparklineColor})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
