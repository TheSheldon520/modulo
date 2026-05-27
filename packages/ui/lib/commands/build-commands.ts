/**
 * @modulo/ui — Pure command list builder
 *
 * Extracted from the `useCommands` hook so that the list-building logic can be
 * tested without React / Next.js context (no jsdom required). The hook is a
 * thin wrapper that passes the translator and args.
 *
 * Sub-exported at `@modulo/ui/lib/commands/build-commands`.
 */

import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Package,
} from "lucide-react";

import type { ModuloCommand } from "./types";

export interface BuildCommandsArgs {
  org: { id: string; slug: string; name: string };
  orgs: { id: string; slug: string; name: string }[];
  enabledModules: { slug: string; name: string }[];
}

/**
 * Translator interface — minimal subset used by buildCommands.
 * Matches the signature of next-intl `useTranslations` return value for the
 * keys we consume, without importing anything from Next or next-intl.
 */
export type CommandTranslator = (
  key:
    | "commands.dashboard"
    | "commands.billing"
    | "commands.switchOrg"
    | "commands.goToModule",
  // Mirrors next-intl 4.x `useTranslations` value types — wider than the
  // initial `Record<string, string>` so future commands can interpolate
  // numbers or dates without re-typing here. Tighter than `unknown` because
  // next-intl itself enforces this union at the call site.
  values?: Record<string, string | number | Date>,
) => string;

/**
 * Pure function that builds the flat command list from runtime data.
 *
 * Rules:
 * - Active org is excluded from the "organization" section (switch to self
 *   is a no-op and would confuse users).
 * - Sections: navigation (always), organization (if ≥1 other org),
 *   module (if ≥1 enabled module).
 */
export function buildCommands(
  { org, orgs, enabledModules }: BuildCommandsArgs,
  t: CommandTranslator,
): ModuloCommand[] {
  const commands: ModuloCommand[] = [];

  // Section: navigation — always present
  commands.push({
    id: "navigate.dashboard",
    label: t("commands.dashboard"),
    icon: LayoutDashboard,
    section: "navigation",
    perform: ({ router, org: ctx }) => router.push(`/${ctx.slug}/dashboard`),
  });

  commands.push({
    id: "navigate.billing",
    label: t("commands.billing"),
    icon: CreditCard,
    section: "navigation",
    // TODO(Phase 1+): migrate to `/${ctx.slug}/settings/billing` when settings
    // routes are moved under `[orgSlug]`. Today `/settings/billing` is org-
    // scoped via cookie, not URL (decision logged in T1.1a brief).
    perform: ({ router }) => router.push("/settings/billing"),
  });

  // Section: organization — only orgs OTHER than the active one
  for (const otherOrg of orgs) {
    if (otherOrg.id === org.id) continue;
    commands.push({
      id: `org.switch.${otherOrg.id}`,
      label: t("commands.switchOrg", { name: otherOrg.name }),
      icon: Building2,
      section: "organization",
      perform: ({ router }) => router.push(`/${otherOrg.slug}/dashboard`),
    });
  }

  // Section: module — enabled modules for the active org
  for (const mod of enabledModules) {
    commands.push({
      id: `module.${mod.slug}`,
      label: t("commands.goToModule", { name: mod.name }),
      icon: Package,
      section: "module",
      perform: ({ router, org: ctx }) =>
        router.push(`/${ctx.slug}/m/${mod.slug}`),
    });
  }

  return commands;
}
