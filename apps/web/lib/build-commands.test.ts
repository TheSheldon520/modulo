// apps/web/lib/build-commands.test.ts
//
// Unit tests for the pure `buildCommands` factory.
// No React / Next.js / jsdom required — runs in Vitest node environment.
// Pattern mirrors apps/web/lib/submit-button.test.ts (T1.0b reference).

import { describe, expect, it } from "vitest";

import { buildCommands } from "@modulo/ui/lib/commands/build-commands";

// Minimal stub translator — returns a deterministic string for each key so
// assertions are stable without a real i18n runtime.
function makeTranslator() {
  return (
    key: string,
    values?: Record<string, string | number | Date>,
  ): string => {
    if (values) {
      return Object.entries(values).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
        key,
      );
    }
    return key;
  };
}

const BASE_ORG = { id: "org-1", slug: "acme", name: "Acme" };
const OTHER_ORG = { id: "org-2", slug: "other", name: "Other Corp" };

describe("buildCommands", () => {
  it("always returns navigation commands (dashboard + billing)", () => {
    const t = makeTranslator();
    const commands = buildCommands(
      { org: BASE_ORG, orgs: [BASE_ORG], enabledModules: [] },
      t,
    );

    const ids = commands.map((c) => c.id);
    expect(ids).toContain("navigate.dashboard");
    expect(ids).toContain("navigate.billing");

    const navCommands = commands.filter((c) => c.section === "navigation");
    expect(navCommands.length).toBe(2);
  });

  it("skips the active org in the organization section", () => {
    const t = makeTranslator();
    const commands = buildCommands(
      {
        org: BASE_ORG,
        orgs: [BASE_ORG, OTHER_ORG],
        enabledModules: [],
      },
      t,
    );

    const orgCommands = commands.filter((c) => c.section === "organization");
    // Only OTHER_ORG should appear, not BASE_ORG (active one)
    expect(orgCommands.length).toBe(1);
    expect(orgCommands[0]?.id).toBe(`org.switch.${OTHER_ORG.id}`);
  });

  it("includes all enabled modules in the module section", () => {
    const t = makeTranslator();
    const modules = [
      { slug: "sales-analytics", name: "Sales Analytics" },
      { slug: "crm", name: "CRM" },
    ];
    const commands = buildCommands(
      { org: BASE_ORG, orgs: [BASE_ORG], enabledModules: modules },
      t,
    );

    const moduleCommands = commands.filter((c) => c.section === "module");
    expect(moduleCommands.length).toBe(2);
    expect(moduleCommands.map((c) => c.id)).toEqual([
      "module.sales-analytics",
      "module.crm",
    ]);
  });

  it("returns only navigation commands when orgs list is empty and no modules enabled", () => {
    const t = makeTranslator();
    const commands = buildCommands(
      { org: BASE_ORG, orgs: [], enabledModules: [] },
      t,
    );

    // Navigation always present, nothing else
    expect(commands.filter((c) => c.section === "navigation").length).toBe(2);
    expect(commands.filter((c) => c.section === "organization").length).toBe(0);
    expect(commands.filter((c) => c.section === "module").length).toBe(0);
  });
});
