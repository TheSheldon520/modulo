/**
 * @modulo/ui — Command palette types
 *
 * Named `ModuloCommand` (not `Command`) to avoid the name clash with
 * cmdk's `<Command>` primitive component re-exported from shadcn.
 *
 * Sub-exported at `@modulo/ui/lib/commands/types`.
 */

import type { LucideIcon } from "lucide-react";

/**
 * Minimal router interface — a structural subset of Next.js
 * `AppRouterInstance`. Declared locally to keep `packages/ui` free of a
 * hard `next` peer dependency. Any object with a `push(href: string)` method
 * satisfies this type (including the real Next router).
 */
export interface MinimalRouter {
  push: (href: string) => void;
}

export interface CommandContext {
  router: MinimalRouter;
  org: { id: string; slug: string };
  // extensible later: trpc, toast, modals, etc.
}

/**
 * Modulo command record consumed by the palette.
 *
 * `shortcut` is reserved for vim-style sequences (`["g", "d"]`) — declared
 * here for forward-compat but NOT wired in T1.1b. Implementation deferred
 * to Phase 1+ (a sequence parser à la react-hotkeys-hook, or a small
 * homegrown one). Don't depend on it firing today.
 */
export interface ModuloCommand {
  id: string;
  label: string;
  icon?: LucideIcon;
  section: "navigation" | "organization" | "module" | "action";
  shortcut?: string[];
  keywords?: string[];
  perform: (ctx: CommandContext) => void | Promise<void>;
}
