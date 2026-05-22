# @modulo/tailwind-preset

Shared Tailwind v4 preset for the Modulo monorepo. Written in the
**CSS-first API**: it maps the design tokens to Tailwind utilities through a
`@theme` block (`theme.css`).

## Usage

The preset is consumed from `apps/web/app/globals.css` (or any app entry
stylesheet) as a plain CSS import:

```css
@import "tailwindcss";
@import "@modulo/ui/tokens"; /* raw token values  */
@import "@modulo/tailwind-preset/theme"; /* token -> utility mapping */
```

Import order matters: the raw token **values** (`@modulo/ui/tokens`) must be
declared before this preset maps them.

There is **no `tailwind.config.ts`** in the apps — that is the Tailwind v4
anti-pattern. All configuration is CSS.

## What it maps

`theme.css` exposes, as Tailwind utilities:

- **Colors** — `surface-*`, `border-*`, `text-*`, `accent*`, semantic
  (`success` / `warning` / `danger` / `info`). Mapped under `--color-*` so
  utilities resolve to `var(--token)` and stay live for runtime per-tenant
  theming.
- **Typography** — the 10-step type scale (`text-2xs` … `text-4xl`),
  letter-spacing presets (`tracking-tight` / `tracking-normal` /
  `tracking-wide`), font families (`font-sans` / `font-mono` / `font-display`).
- **Radius** — `rounded-sm` … `rounded-xl`.
- **Shadows** — `shadow-sm` … `shadow-lg`, `shadow-glow`.
- **Easings** — `ease-out`, `ease-in-out`.

`--duration-*` has no standard `@theme` namespace in Tailwind v4 and is left as
a raw CSS variable (defined in `@modulo/ui/tokens`); consume it directly via
`transition-duration: var(--duration-base)`.

The whole block uses `@theme inline` so utilities reference `var(--token)`
rather than inlining resolved values.

## Token ownership

This package owns the **mapping** only. The token **values** live in
`@modulo/ui/tokens` (`colors.css`, `typography.css`). The single source of
truth for the values themselves is `docs/DESIGN_SYSTEM.md`.

## Historique

- **T0.1** — preset créé en API Tailwind v3 (objet `Partial<Config>` dans
  `index.ts`), non câblé.
- **T0.2** — décision : Tailwind v4 ne charge pas `tailwind.config.ts`. Le
  portage se fera en CSS-first (`@theme`), câblé via `@import` depuis
  `globals.css`, sans recréer de `tailwind.config.ts`.
- **T0.3** — portage effectif : ajout de `theme.css`. `index.ts` est conservé
  temporairement comme legacy (voir l'en-tête du fichier) et sera supprimé une
  fois le câblage v4 validé.
