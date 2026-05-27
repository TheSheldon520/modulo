// "use client" — owns the button onClick that dispatches the custom event.
// The <CommandPalette> it mounts is already a Client Component.
"use client";

// apps/web/app/(dev)/styleguide/command-palette-demo.tsx
//
// Styleguide demo for the CommandPalette component.
// Uses mock data so the demo works without a real auth session.

import { CommandPalette, OPEN_EVENT } from "@/app/(app)/[orgSlug]/_components/command-palette/command-palette";
import { Button } from "@modulo/ui/components/button";

const MOCK_ORG = { id: "demo-1", slug: "demo", name: "Demo Org" };
const MOCK_ORGS = [
  { id: "demo-1", slug: "demo", name: "Demo Org" },
  { id: "demo-2", slug: "other", name: "Other Org" },
];
const MOCK_MODULES = [{ slug: "sales-analytics", name: "Sales Analytics" }];

export function CommandPaletteDemo() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Mock org + orgs + modules pour la démo. Fonctionne avec{" "}
        <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-primary">
          Cmd+K
        </kbd>{" "}
        /{" "}
        <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-text-primary">
          Ctrl+K
        </kbd>{" "}
        ou le bouton ci-dessous.
      </p>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent(OPEN_EVENT))}
        >
          Ouvrir la palette (Cmd+K)
        </Button>
      </div>
      {/* Portal dialog — position in DOM is irrelevant visually */}
      <CommandPalette
        org={MOCK_ORG}
        orgs={MOCK_ORGS}
        enabledModules={MOCK_MODULES}
      />
    </div>
  );
}
