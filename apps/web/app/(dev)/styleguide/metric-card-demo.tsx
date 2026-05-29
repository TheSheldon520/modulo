"use client";
// "use client" justification: MetricCard imports Recharts which requires DOM.

import { MetricCard, MetricCardSkeleton } from "@modulo/ui/components/metric-card";

const SPARKLINE_DATA = [
  { x: "2026-04-07", y: 12000 },
  { x: "2026-04-14", y: 28000 },
  { x: "2026-04-21", y: 15000 },
  { x: "2026-04-28", y: 42000 },
  { x: "2026-05-05", y: 35000 },
  { x: "2026-05-12", y: 67000 },
];

export function MetricCardDemo() {
  return (
    <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Populated — positive variation + sparkline */}
      <MetricCard
        label="CA total"
        value="204 k€"
        variation={{ delta: 45000, percentage: 28.3 }}
        sparkline={SPARKLINE_DATA}
        sparklineColor={1}
      />

      {/* Populated — negative variation, no sparkline */}
      <MetricCard
        label="Deals gagnés"
        value="4"
        variation={{ delta: -2, percentage: -33.3 }}
        sparklineColor={2}
      />

      {/* Populated — null conversionRate (no data = no variation row) */}
      <MetricCard
        label="Taux de conversion"
        value="—"
        variation={null}
      />

      {/* Loading skeleton */}
      <MetricCardSkeleton />
    </div>
  );
}
