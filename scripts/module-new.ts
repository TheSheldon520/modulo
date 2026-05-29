// scripts/module-new.ts
//
// Scaffolds a new module under `modules/<id>` from in-file templates.
//
// Usage:
//   pnpm module:new <module-id>
//
// `<module-id>` must be kebab-case (`^[a-z][a-z0-9-]*[a-z0-9]$`). The script
// validates the argument, refuses to overwrite an existing module directory,
// and writes six files:
//
//   modules/<id>/module.config.ts
//   modules/<id>/schema.ts
//   modules/<id>/router.ts
//   modules/<id>/package.json
//   modules/<id>/README.md
//   modules/<id>/__tests__/module.test.ts
//
// After scaffolding, the operator MUST:
//   1. re-export the schema from `packages/db/schema/index.ts`
//   2. run `pnpm db:generate --name=<id>_init`
//   3. run `pnpm db:migrate`
//   4. wire the router into the root tRPC router (T1.3+)
//
// The script never touches the registry (`packages/api/src/modules/registry.ts`)
// or any other shared file — those are deliberate manual edits.

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// CLI argument parsing & validation
// ---------------------------------------------------------------------------

const KEBAB_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

function printHelpAndExit(code: number): never {
  const lines = [
    "",
    "  pnpm module:new <module-id>",
    "",
    "  <module-id> must be kebab-case, e.g. `sales-analytics`, `crm`,",
    "  `field-service`. Allowed characters: [a-z0-9-]. Must start with a",
    "  letter and end with a letter or digit.",
    "",
    "  Examples:",
    "    pnpm module:new sales-analytics",
    "    pnpm module:new crm",
    "",
  ];
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(code);
}

const rawArg = process.argv[2];
if (!rawArg) {
  process.stderr.write("Error: missing <module-id> argument.\n");
  printHelpAndExit(1);
}

const moduleId = rawArg;

if (!KEBAB_RE.test(moduleId)) {
  process.stderr.write(
    `Error: "${moduleId}" is not a valid kebab-case identifier.\n` +
      `       Must match ${KEBAB_RE.source}.\n`,
  );
  printHelpAndExit(1);
}

// ---------------------------------------------------------------------------
// Path resolution (script lives at <repo>/scripts/module-new.ts)
// ---------------------------------------------------------------------------

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const moduleDir = resolve(repoRoot, "modules", moduleId);

if (existsSync(moduleDir)) {
  process.stderr.write(
    `Error: module "${moduleId}" already exists at modules/${moduleId}.\n` +
      `       Delete it first if you really want to re-scaffold.\n`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Token derivations
// ---------------------------------------------------------------------------

/** "sales-analytics" → "SalesAnalytics" */
function toPascal(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** "sales-analytics" → "salesAnalytics" */
function toCamel(id: string): string {
  const pascal = toPascal(id);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** "sales-analytics" → "Sales Analytics" */
function toHuman(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** "sales-analytics" → "SALES_ANALYTICS" (env var suffix) */
function toEnv(id: string): string {
  return id.toUpperCase().replace(/-/g, "_");
}

/** "sales-analytics" → "sales_analytics" (SQL identifier prefix) */
function toUnderscored(id: string): string {
  return id.replace(/-/g, "_");
}

const tokens: Record<string, string> = {
  "<PascalName>": toPascal(moduleId),
  "<HumanName>": toHuman(moduleId),
  "<idUnderscored>": toUnderscored(moduleId),
  "<idCamel>": toCamel(moduleId),
  "<envName>": toEnv(moduleId),
  "<id>": moduleId,
};

/**
 * Apply token substitution. Tokens are sorted by length descending so that
 * `<PascalName>` is matched before `<id>`, avoiding partial collisions
 * (e.g. `<id>` matching inside `<idCamel>`).
 */
function render(template: string): string {
  const ordered = Object.keys(tokens).sort((a, b) => b.length - a.length);
  let out = template;
  for (const token of ordered) {
    out = out.replaceAll(token, tokens[token]!);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Templates (in-file)
// ---------------------------------------------------------------------------

const moduleConfigTpl = `// modules/<id>/module.config.ts
//
// Static configuration for the "<HumanName>" module. The registry in
// \`packages/api/src/modules/registry.ts\` is the source of truth for billing
// and availability; this file holds module-local metadata (icon, scopes, UI
// surface) consumed by the module itself and the shell.
//
// \`ModuleConfig\` is centralised since T1.3 in \`@modulo/api/modules/types\` —
// every module imports the same type so the shell consumes a single shape
// across the suite. Do not re-declare it locally.
//
// TODO Chris (after scaffolding): customise the placeholders flagged below.

import type { ModuleConfig } from "@modulo/api/modules/types";
import { requireEnv } from "@modulo/auth/env";

export const <idCamel>Config = {
  id: "<id>",
  // TODO: shorten if desired (e.g. "sales" instead of "sales-analytics"). Used in URLs.
  slug: "<id>",
  name: "<HumanName>",
  // TODO: shorter label for tight surfaces (sidebar, breadcrumbs).
  shortName: "<HumanName>",
  // TODO: one-sentence pitch (shown in /settings/billing + marketing).
  description: "TODO: describe what <HumanName> does",
  // TODO: pick the right category.
  category: "productivity",
  // TODO: pick a Lucide icon name (https://lucide.dev/icons/).
  icon: "Package",
  get stripePriceId(): string {
    return requireEnv("STRIPE_PRICE_<envName>");
  },
  // TODO: align with the registry entry in packages/api/src/modules/registry.ts.
  monthlyPriceLabel: "29€/mois",
  scopes: ["<id>:read", "<id>:write", "<id>:admin"],
  // TODO: declare the module's nav surface — paths and icons.
  navigation: [
    { label: "Vue d'ensemble", href: "/m/<id>", icon: "LayoutDashboard" },
  ],
  defaultRolePermissions: {
    owner: ["<id>:read", "<id>:write", "<id>:admin"],
    admin: ["<id>:read", "<id>:write", "<id>:admin"],
    member: ["<id>:read", "<id>:write"],
    viewer: ["<id>:read"],
  },
} as const satisfies ModuleConfig;

export type <PascalName>Scope = (typeof <idCamel>Config.scopes)[number];
`;

const schemaTpl = `// modules/<id>/schema.ts
//
// Drizzle schema for the "<HumanName>" module. Every table here MUST:
//   - carry an \`organization_id uuid NOT NULL REFERENCES organizations(id)\`
//     with \`ON DELETE CASCADE\`
//   - index \`organization_id\`
//   - use uuid v7 PKs (generated via \`uuidv7()\` at the app layer)
//   - use timestamptz for time columns
//
// Tables are exported individually and the file is re-exported from
// \`packages/db/schema/index.ts\` so \`drizzle-kit\` discovers them.

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

import { organizations } from "@modulo/db/schema";

export const <idCamel>Example = pgTable(
  "<idUnderscored>_example",
  {
    id: uuid("id")
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("<idUnderscored>_example_organization_id_idx").on(table.organizationId)],
);

export type <PascalName>Example = typeof <idCamel>Example.$inferSelect;
export type New<PascalName>Example = typeof <idCamel>Example.$inferInsert;
`;

const schemasTpl = `// modules/<id>/schemas.ts
//
// Pure-isomorphic Zod schemas + canonical enums for the "<HumanName>" module.
// This file is consumable from BOTH server and client without dragging any
// server-only code into the browser bundle (no \`@trpc/server\`, no Drizzle,
// no \`@modulo/api\`). Only \`zod\` is imported.
//
// Convention Modulo (T1.3): any module that exposes schemas/enums to the UI
// layer ships them here. Client Components MUST import from
// \`@modulo/<id>/schemas\` — NEVER from \`@modulo/<id>\` (the root barrel
// re-exports the router which transitively pulls @trpc/server, and Next
// would crash at hydration with "@trpc/server cannot be used in the browser").

import { z } from "zod";

// TODO: declare your module's wire schemas here. Example:
//
// export const <idCamel>CreateSchema = z.object({
//   name: z.string().min(1).max(200),
// });
// export type <PascalName>CreateInput = z.infer<typeof <idCamel>CreateSchema>;
`;

const routerTpl = `// modules/<id>/router.ts
//
// tRPC router for the "<HumanName>" module. Every procedure here MUST start
// from \`moduleProcedure("<id>")\` so the "module-not-enabled → 403" check is
// applied automatically and \`ctx.activeOrg\` is narrowed to non-null.
//
// Wire schemas live in \`./schemas\` (pure-isomorphic, no @trpc/server) so
// Client Components can consume them safely. Import them here, then re-export
// for server-side callers via the package root.
//
// T1.2 ships an empty router shell — actual procedures land in T1.3+.

import { moduleProcedure, router } from "@modulo/api";

// import { <idCamel>CreateSchema } from "./schemas";

const <idCamel>Procedure = moduleProcedure("<id>");

export const <idCamel>Router = router({
  // Procedures land in T1.3+. Keeping the namespace declared so the root
  // router can mount it without rewiring imports later.
  _placeholder: <idCamel>Procedure.query(() => ({ ok: true as const })),
});

export type <PascalName>Router = typeof <idCamel>Router;
`;

const packageJsonTpl = `{
  "name": "@modulo/<id>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./router.ts",
    "./schema": "./schema.ts",
    "./schemas": "./schemas.ts",
    "./config": "./module.config.ts"
  },
  "files": [
    "module.config.ts",
    "schema.ts",
    "schemas.ts",
    "router.ts",
    "README.md"
  ],
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@modulo/api": "workspace:*",
    "@modulo/auth": "workspace:*",
    "@modulo/db": "workspace:*",
    "drizzle-orm": "0.38.3",
    "uuidv7": "1.0.2",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "vitest": "4.1.7"
  }
}
`;

const readmeTpl = `# @modulo/<id>

**Status**: scaffolded (T1.2) — not yet wired into the root tRPC router.

The "<HumanName>" module. Scaffolded with \`pnpm module:new <id>\`.

## Layout

| File | Purpose |
|------|---------|
| \`module.config.ts\` | Module-local metadata (icon, scopes, Stripe price getter). |
| \`schema.ts\` | Drizzle tables. Re-exported from \`packages/db/schema/index.ts\`. |
| \`schemas.ts\` | Pure-isomorphic Zod schemas. Imported by both the router AND Client Components — never import from the router barrel client-side. |
| \`router.ts\` | tRPC router. Mounted in \`packages/api/src/router.ts\` (T1.3+). |
| \`__tests__/\` | Vitest smoke tests. |

## Invariants

- Every table carries \`organization_id\` (indexed, FK CASCADE) — multi-tenant safety.
- Every procedure starts from \`moduleProcedure("<id>")\` — module-enablement gate.
- No import from another \`modules/*\` package — inter-module comms via events or public routers only.

## Next steps after scaffold

1. Customise \`module.config.ts\` (icon, scopes, price label).
2. Replace the example table in \`schema.ts\` with real tables.
3. Re-export from \`packages/db/schema/index.ts\`:
   \`\`\`ts
   export * from "../../../modules/<id>/schema";
   \`\`\`
4. Generate migration: \`pnpm db:generate --name=<idUnderscored>_init\`.
5. Apply migration: \`pnpm db:migrate\`.
6. Wire the router into \`packages/api/src/router.ts\` (T1.3+).
`;

const testTpl = `// modules/<id>/__tests__/module.test.ts
//
// Smoke test — ensures the module config is well-formed and that the package
// boundary works (router export resolves, scopes are read-only literals).

import { describe, expect, it } from "vitest";

import { <idCamel>Config } from "../module.config";

describe("<HumanName> module config", () => {
  it("declares the expected module id", () => {
    expect(<idCamel>Config.id).toBe("<id>");
  });

  it("exposes three scopes (read / write / admin)", () => {
    expect(<idCamel>Config.scopes).toHaveLength(3);
    expect(<idCamel>Config.scopes).toContain("<id>:read");
    expect(<idCamel>Config.scopes).toContain("<id>:write");
    expect(<idCamel>Config.scopes).toContain("<id>:admin");
  });
});
`;

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

interface FileSpec {
  relativePath: string;
  template: string;
}

const files: FileSpec[] = [
  { relativePath: "module.config.ts", template: moduleConfigTpl },
  { relativePath: "schema.ts", template: schemaTpl },
  { relativePath: "schemas.ts", template: schemasTpl },
  { relativePath: "router.ts", template: routerTpl },
  { relativePath: "package.json", template: packageJsonTpl },
  { relativePath: "README.md", template: readmeTpl },
  { relativePath: "__tests__/module.test.ts", template: testTpl },
];

mkdirSync(moduleDir, { recursive: true });
mkdirSync(resolve(moduleDir, "__tests__"), { recursive: true });

const written: string[] = [];
for (const { relativePath, template } of files) {
  const absPath = resolve(moduleDir, relativePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, render(template), "utf8");
  written.push(`modules/${moduleId}/${relativePath}`);
}

process.stdout.write(
  [
    "",
    `  Module "${moduleId}" scaffolded at modules/${moduleId}.`,
    "",
    "  Files created:",
    ...written.map((p) => `    - ${p}`),
    "",
    "  Next steps:",
    `    1. Re-export the schema from packages/db/schema/index.ts:`,
    `       export * from "../../modules/${moduleId}/schema";`,
    `    2. pnpm install   # picks up the new workspace package`,
    `    3. pnpm db:generate --name=${toUnderscored(moduleId)}_init`,
    `    4. pnpm db:migrate`,
    `    5. Wire modules/${moduleId}/router.ts into packages/api/src/router.ts (T1.3+)`,
    "",
  ].join("\n") + "\n",
);
