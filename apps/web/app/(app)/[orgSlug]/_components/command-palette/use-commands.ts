// apps/web/app/(app)/[orgSlug]/_components/command-palette/use-commands.ts
//
// Thin React wrapper around the pure `buildCommands` factory.
// Colocated here (not in packages/ui) because it depends on next-intl
// `useTranslations` — a runtime hook not available in packages/ui.
//
// Note: `router` is NOT needed here — it is passed via CommandContext at
// invocation time in `handleSelect` inside <CommandPalette>, keeping
// `perform` callbacks pure and the list re-buildable without a router ref.

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
  buildCommands,
  type BuildCommandsArgs,
} from "@modulo/ui/lib/commands/build-commands";
import type { ModuloCommand } from "@modulo/ui/lib/commands/types";

export function useCommands({
  org,
  orgs,
  enabledModules,
}: BuildCommandsArgs): ModuloCommand[] {
  const t = useTranslations("app.commandPalette");

  // Derive stable primitive keys from arrays — RSC-serialised props arrive as
  // fresh references on every parent re-render even when their content is
  // identical, so depending on `orgs`/`enabledModules` by reference would
  // defeat the memo on every render. The ID/slug projections capture the only
  // bits that actually drive the output of `buildCommands`.
  const orgsKey = orgs.map((o) => o.id).join(",");
  const modulesKey = enabledModules.map((m) => m.slug).join(",");

  return useMemo(
    () =>
      buildCommands({ org, orgs, enabledModules }, (key, values) =>
        t(key, values),
      ),
    // We depend on stable string projections (orgsKey/modulesKey) instead of
    // the array references themselves; `org` is destructured into primitives.
    // `orgs` and `enabledModules` are intentionally absent from the deps —
    // their content is captured by the projections.
    [org.id, org.slug, org.name, orgsKey, modulesKey, t],
  );
}
