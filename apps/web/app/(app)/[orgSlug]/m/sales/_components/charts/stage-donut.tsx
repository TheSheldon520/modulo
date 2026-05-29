"use client";
// "use client" justification: Recharts requires DOM APIs (ResizeObserver,
// canvas measurements). Leaf dataviz component — no data fetching.

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatDealAmount } from "@/lib/deal-format";
import { getStageDonutColor } from "@/lib/sales-overview-format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StageDataPoint {
  stage: string;
  count: number;
  amount: number;
}

interface StageDonutProps {
  data: StageDataPoint[];
  /** i18n label resolver for stage names — caller is responsible for i18n. */
  getStageLabelFn: (stage: string) => string;
  /** Label rendered when `data` is empty — caller controls i18n. */
  emptyLabel: string;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  payload: StageDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  getStageLabelFn: (stage: string) => string;
}

function CustomTooltip({ active, payload, getStageLabelFn }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <div className="rounded-md border border-border-default bg-surface-2 px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-text-primary">
        {getStageLabelFn(entry.stage)}
      </p>
      <p className="mt-0.5 text-xs text-text-secondary">
        {entry.count} deal{entry.count !== 1 ? "s" : ""}
        {" · "}
        {formatDealAmount(String(entry.amount))}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

interface LegendProps {
  data: StageDataPoint[];
  getStageLabelFn: (stage: string) => string;
}

function DonutLegend({ data, getStageLabelFn }: LegendProps) {
  return (
    <div className="flex flex-col gap-2">
      {data.map((entry) => (
        <div key={entry.stage} className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: getStageDonutColor(entry.stage) }}
          />
          <span className="text-xs text-text-secondary">
            {getStageLabelFn(entry.stage)}
          </span>
          <span className="ml-auto font-mono text-xs text-text-tertiary">
            {entry.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StageDonut
// ---------------------------------------------------------------------------

export function StageDonut({ data, getStageLabelFn, emptyLabel }: StageDonutProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-6">
      {/* Donut */}
      <div className="h-[200px] min-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="stage"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              strokeWidth={2}
              stroke="var(--color-surface-1)"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.stage}
                  fill={getStageDonutColor(entry.stage)}
                />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  active={props.active}
                  payload={props.payload as TooltipPayloadItem[] | undefined}
                  getStageLabelFn={getStageLabelFn}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1">
        <DonutLegend data={data} getStageLabelFn={getStageLabelFn} />
      </div>
    </div>
  );
}
