// "use client" — owns open/close state (useState) + browser event listeners
// (document.addEventListener, window.addEventListener) + useRouter for
// navigation. Cannot be a Server Component.
"use client";

// apps/web/app/(app)/[orgSlug]/_components/command-palette/command-palette.tsx
//
// Global command palette. Opened via:
//   1. Cmd+K / Ctrl+K keyboard shortcut (captured globally via document)
//   2. Custom event `modulo:open-cmdk` dispatched by the Topbar button
//
// Custom event rationale: avoids prop-drilling an `onOpen` callback from
// the layout → SidebarShell → Topbar. The palette and the Topbar are
// siblings under the same layout; a single window event is the cleanest
// decoupling for this exact topology.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@modulo/ui/components/command";
import type { ModuloCommand } from "@modulo/ui/lib/commands/types";

import { useCommands } from "./use-commands";

// Exported so the Topbar button can import the constant rather than
// hardcode the event name string.
export const OPEN_EVENT = "modulo:open-cmdk";

interface CommandPaletteProps {
  org: { id: string; slug: string; name: string };
  orgs: { id: string; slug: string; name: string }[];
  enabledModules: { slug: string; name: string }[];
}

// `"action"` section (e.g. "Create deal", "Import CSV") will land with the
// first business module in T1.2+ — declared in `ModuloCommand` for forward-
// compat but no consumer emits it yet, so it's omitted from the render order.
const SECTIONS = ["navigation", "organization", "module"] as const;
type Section = (typeof SECTIONS)[number];

export function CommandPalette({
  org,
  orgs,
  enabledModules,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("app.commandPalette");
  const commands = useCommands({ org, orgs, enabledModules });

  // Global Cmd+K (Mac) / Ctrl+K (Windows) + custom event from Topbar button
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const onOpenEvent = () => setOpen(true);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  function handleSelect(command: ModuloCommand) {
    setOpen(false);
    void command.perform({ router, org: { id: org.id, slug: org.slug } });
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>
        {SECTIONS.map((section: Section) => {
          const sectionCommands = commands.filter(
            (c) => c.section === section,
          );
          if (sectionCommands.length === 0) return null;
          return (
            <CommandGroup key={section} heading={t(`sections.${section}`)}>
              {sectionCommands.map((command) => {
                const Icon = command.icon;
                return (
                  <CommandItem
                    key={command.id}
                    value={`${command.label} ${(command.keywords ?? []).join(" ")}`}
                    onSelect={() => handleSelect(command)}
                  >
                    {Icon ? (
                      <Icon className="size-4" strokeWidth={1.5} />
                    ) : null}
                    <span>{command.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
