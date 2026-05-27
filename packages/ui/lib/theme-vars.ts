/*
 * @modulo/ui — theme-vars
 *
 * Pure projection from the persisted tenant theme map (DB column
 * `organizations.theme`, type `Record<string, string> | null`) to a React
 * `CSSProperties` style object suitable for `<body style={...}>` on the
 * org-scoped layout.
 *
 * The contract is intentionally minimal in Phase 1:
 *   - `null` (no override declared) → `{}` (use platform defaults)
 *   - `{}`  (override declared, cleared) → `{}` (same outward effect, but a
 *     downstream settings UI may want to distinguish them; see the column doc
 *     in `packages/db/schema/core.ts`)
 *   - `{ "--accent": "oklch(0.7 0.18 142)" }` → `{ "--accent": "..." }`
 *
 * The function does NOT validate keys: it does not whitelist `--accent` /
 * `--radius` / etc. That validation belongs to the future theme editor
 * (Phase 1 settings UI) — keeping this projection dumb makes it usable for any
 * CSS variable name without rewriting it every time the design system grows.
 *
 * Why not return `undefined` for the empty case? React happily accepts `{}`
 * as a `style` prop and writes no inline attributes. Returning `{}` lets the
 * caller stay branchless: `<body style={generateThemeVars(org.theme)}>`.
 */
import type { CSSProperties } from "react";

/**
 * The on-disk shape of `organizations.theme`. Re-declared here (rather than
 * imported from `@modulo/db`) so `@modulo/ui` stays free of any DB / server
 * dependency — it remains importable from client bundles.
 */
export type TenantTheme = Record<string, string> | null;

export function generateThemeVars(theme: TenantTheme): CSSProperties {
  if (!theme) return {};
  // `CSSProperties` accepts arbitrary `--foo` keys at runtime; TS narrows the
  // signature to known properties, so we widen through a cast at the return
  // boundary only. The input shape is already `Record<string, string>`.
  return theme as unknown as CSSProperties;
}
