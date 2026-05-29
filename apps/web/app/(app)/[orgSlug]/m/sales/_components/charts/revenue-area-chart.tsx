"use client";
// "use client" justification: Recharts requires DOM APIs (ResizeObserver,
// canvas measurements). This is a leaf dataviz component — no data fetching,
// receives data as props from the parent Server or Client Component.

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMonthLabel, formatRevenueCompact } from "@/lib/sales-overview-format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueDataPoint {
  month: string;  // "YYYY-MM"
  revenue: number;
}

interface RevenueAreaChartProps {
  data: RevenueDataPoint[];
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-border-default bg-surface-2 px-3 py-2 shadow-md">
      <p className="text-xs text-text-tertiary">
        {label ? formatMonthLabel(label) : ""}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-text-primary">
        {formatRevenueCompact(value)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RevenueAreaChart
// ---------------------------------------------------------------------------

export function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const chartColor = "var(--color-chart-1)";

  // Transform data for Recharts — keep month key for axis ticks
  const chartData = data.map((d) => ({
    month: d.month,
    revenue: d.revenue,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tickFormatter={(v: number) => formatRevenueCompact(v)}
          tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
          tickLine={false}
          axisLine={false}
          width={64}
        />

        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={props.payload as TooltipPayloadItem[] | undefined}
              label={props.label as string | undefined}
            />
          )}
          cursor={{ stroke: "var(--color-border-default)", strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chartColor}
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{
            r: 4,
            fill: chartColor,
            stroke: "var(--color-surface-2)",
            strokeWidth: 2,
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
