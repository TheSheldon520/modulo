# `@modulo/ui` — Components

shadcn/ui primitives (new-york style), retokenized to the **Modulo design
system**. The stock shadcn components ship with their own semantic color layer
(`--primary`, `--muted`, `--border`, ...). Modulo already owns a complete token
system (`@modulo/ui/tokens` + `@modulo/tailwind-preset/theme`), so every shadcn
class is rewritten to a Modulo utility — there is **no bridge / compatibility
layer**. `theme.css` is never touched: it stays the single source of theme
mapping.

## Importing

Each component is exposed as a subpath of the package:

```tsx
import { Button } from "@modulo/ui/components/button"
import { Card, CardHeader, CardContent } from "@modulo/ui/components/card"
import { cn } from "@modulo/ui/lib/utils"
```

The package ships raw `.tsx`; `apps/web` lists `@modulo/ui` in
`transpilePackages` so Next compiles it.

## shadcn -> Modulo class mapping

The retokenization follows this table. When a stock class had no exact Modulo
equivalent, the closest token by **intent** was chosen (noted below).

| shadcn class                          | Modulo class                         | Notes |
| -------------------------------------- | ------------------------------------- | ----- |
| `bg-background`                        | `bg-surface-0`                        | app background |
| `text-foreground`                      | `text-text-primary`                   | |
| `bg-card` / `text-card-foreground`     | `bg-surface-1` / `text-text-primary`  | |
| `bg-popover` / `text-popover-foreground` | `bg-surface-2` / `text-text-primary` | popovers, menus, command, select content |
| `bg-primary` / `text-primary-foreground` | `bg-accent` / `text-accent-foreground` | brand color |
| `hover:bg-primary/90`                  | `hover:bg-accent-hover`               | dedicated hover token |
| `text-primary` / `border-primary` / `fill-primary` | `text-accent` / `border-accent` / `fill-accent` | |
| `selection:bg-primary`                 | `selection:bg-accent`                 | |
| `bg-secondary` / `text-secondary-foreground` | `bg-surface-2` / `text-text-primary` | |
| `hover:bg-secondary/80`                | `hover:bg-surface-3`                  | |
| `bg-muted`                             | `bg-surface-2`                        | |
| `text-muted-foreground`                | `text-text-secondary`                 | |
| `bg-muted/50` (table zebra/hover)      | `bg-surface-2/50`                     | |
| `bg-destructive` / `text-destructive` / `border-destructive` | `bg-danger` / `text-danger` / `border-danger` | |
| `border` / `border-border`             | `border-border-subtle`                | default container border |
| `border-input`                         | `border-border-default`               | inputs use a more visible border |
| `bg-input`                             | `bg-surface-3`                        | switch unchecked track |
| `bg-border`                            | `bg-border-subtle`                    | menu/select separators |
| `ring-ring` / `border-ring` / `outline-ring` | `ring-accent` / `border-accent` / `outline-accent` | focus = brand accent (DESIGN_SYSTEM §4) |
| `ring-ring/50`                         | `ring-accent/50`                      | |
| `ring-background` / `ring-offset-background` | `ring-surface-0` / `ring-offset-surface-0` | avatar rings, close buttons |
| `bg-black/50` (modal overlay)          | `bg-surface-0/70`                     | dark scrim from a real token |
| `text-white`                           | `text-accent-foreground`              | destructive button/badge text |
| `bg-foreground` / `fill-foreground` (tooltip) | `bg-text-primary` / `fill-text-primary` | inverted tooltip — see below |
| `text-background` (tooltip)            | `text-surface-0`                      | inverted tooltip — see below |
| `shadow-xs`                            | `shadow-sm`                           | Modulo has no `xs` shadow token |
| `rounded-md/lg/xl`                     | unchanged                             | already mapped to `--radius-*` |
| `rounded-[4px]` / `rounded-[2px]` / `rounded-xs` | `rounded-sm`                  | no hardcoded radius pixels allowed |

### The `accent` collision (important)

shadcn uses **two** different meanings for `accent`:

1. `--accent` as the **brand color** — Modulo's `--accent` (electric green).
2. `bg-accent` / `text-accent-foreground` as a neutral **hover/active surface**
   for menu items, dropdown items, select items, etc. This is *not* a brand
   color in shadcn — it is just "a slightly highlighted row".

Modulo's token system reserves `accent` strictly for the **brand color** (case
1). So every shadcn `bg-accent` / `text-accent-foreground` that meant "hover
surface" (case 2) was remapped to **`bg-surface-3` / `text-text-primary`** — a
neutral elevated surface. Brand `accent` is only used where shadcn meant the
real primary color (buttons, checked states, focus rings, the active tab
indicator).

### Single dark theme

Modulo ships one dark theme. All `dark:` variant classes from the stock shadcn
components were **removed** (they were no-ops without a light theme and only
added noise). If a light theme is ever introduced it will be a token-level
concern, not a per-component one.

### Inverted tooltip

`Tooltip` keeps shadcn's inverted look on purpose: a light surface
(`bg-text-primary`) with dark text (`text-surface-0`) for maximum contrast
against the dark app. This is a deliberate exception to "surfaces go light-to-
dark".

### `Toaster` / sonner

The stock component wires `next-themes` to pick light/dark. Modulo is dark-only
with no theme provider, so the `next-themes` integration was dropped: `theme`
is pinned to `"dark"` and the sonner CSS variables point straight at Modulo
tokens (`--surface-2`, `--text-primary`, `--border-subtle`, `--radius-md`).

## Component inventory (19)

`button`, `input`, `select`, `textarea`, `checkbox`, `switch`, `radio-group`,
`dialog`, `sheet`, `popover`, `dropdown-menu`, `tooltip`, `card`, `tabs`,
`table`, `badge`, `avatar`, `sonner`, `command`.

`table` is the base shadcn version; the TanStack Table wiring (sorting,
filtering, virtualization) lands later with the `<DataTable />` custom
component (roadmap T1.4).

## Updating a component

These files are owned code, not a dependency. To pull an upstream shadcn fix,
re-run `pnpm dlx shadcn@latest add <name>` from this package, then re-apply the
mapping in the table above. Never reintroduce raw `bg-zinc-*`, `text-[#...]`,
hardcoded radius pixels, or `dark:` variants.
