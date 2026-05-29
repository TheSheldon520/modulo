// modules/sales-analytics/lib/stages.ts
//
// Pure-isomorphic single source of truth for the deal pipeline stages —
// columns of the Kanban board, badges in the table, slices of the overview
// donut all derive from THIS file. Nothing else.
//
// Anti-debt guardrail: if a screen needs to iterate over stages, it must
// `import { STAGES } from "@modulo/sales-analytics/lib/stages"` rather than
// hardcoding the five strings in JSX. The day we migrate to
// `sales_pipeline_stages` (org-configurable pipelines), only THIS file needs
// to swap its constant array for a runtime query — every consumer keeps
// working without touching the JSX.
//
// No server-only imports (no @trpc/server, no Drizzle, no @modulo/api). The
// file is isomorphic so Client Components can consume it via the
// `./lib/stages` sub-export without dragging server code into the browser.

import type { DealStage } from "../schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Semantic colour family for a stage, mapped by callers to design-system
 * tokens (e.g. `info` → `bg-info/10 text-info`, `neutral` → `text-tertiary`,
 * etc.). Kept as an abstract alias rather than raw Tailwind classes so the
 * source of truth stays declarative — UI components own the mapping.
 */
export type StageColor = "info" | "neutral" | "warning" | "success" | "danger";

/**
 * High-level lifecycle bucket of a stage:
 *   - `open` : still actively worked (lead, qualified, proposal)
 *   - `won`  : closed positively
 *   - `lost` : closed negatively
 *
 * Used by overview KPIs (pipeline value = sum of `open` deals, conversion =
 * `won / (won + lost)`) and by the Kanban DnD logic for the closedAt rule
 * (entering won/lost sets closedAt = now; leaving them clears it).
 */
export type StageLifecycle = "open" | "won" | "lost";

export interface StageDescriptor {
  /** Canonical lowercase code persisted in the DB (`sales_deals.stage`). */
  id: DealStage;
  /** Suffix of the i18n key: callers resolve `t(\`stages.${label}\`)`. */
  label: DealStage;
  /** Semantic colour family — UI maps to design-system tokens. */
  color: StageColor;
  /** Lifecycle bucket — drives pipeline value, conversion, closedAt rule. */
  type: StageLifecycle;
}

// ---------------------------------------------------------------------------
// Source of truth
// ---------------------------------------------------------------------------

/**
 * The ordered pipeline. **Iterate over THIS** to build Kanban columns, donut
 * slices, dropdowns, etc. Never hardcode the five strings in JSX or in
 * conditionals — the ordering, the colours, and the lifecycle bucketing all
 * live here so a future migration to org-configurable pipelines stays a
 * single-file change.
 *
 * Colour intent (T1.3 / T1.4 conventions, re-stated for traceability):
 *   - lead      → info     : new opportunity, neutral discovery
 *   - qualified → neutral  : intermediate funnel state (no semantic charge)
 *   - proposal  → warning  : pending decision, attention required
 *   - won       → success  : closed positively
 *   - lost      → danger   : closed negatively
 */
export const STAGES = [
  { id: "lead", label: "lead", color: "info", type: "open" },
  { id: "qualified", label: "qualified", color: "neutral", type: "open" },
  { id: "proposal", label: "proposal", color: "warning", type: "open" },
  { id: "won", label: "won", color: "success", type: "won" },
  { id: "lost", label: "lost", color: "danger", type: "lost" },
] as const satisfies readonly StageDescriptor[];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Returns the descriptor for a stage code. Falls back to `undefined` for an
 * unknown stage so callers can render a neutral placeholder instead of
 * crashing on stale data (e.g. a stage removed in a future migration).
 */
export function getStageDescriptor(
  stage: string,
): StageDescriptor | undefined {
  return STAGES.find((s) => s.id === stage);
}

/** True for `lead`, `qualified`, `proposal`. */
export function isOpenStage(stage: DealStage): boolean {
  return getStageDescriptor(stage)?.type === "open";
}

/** True for `won` and `lost` — i.e. a closed deal. */
export function isClosedStage(stage: DealStage): boolean {
  const type = getStageDescriptor(stage)?.type;
  return type === "won" || type === "lost";
}
