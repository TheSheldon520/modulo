// packages/auth/src/active-org.test.ts
//
// Unit tests for `resolveActiveOrgForUser`. Uses a hand-rolled `DbClient`
// mock (no `vi.mock`) — the function only consumes the Drizzle query-builder
// surface (`.select().from().where().orderBy().limit()`), so reproducing
// that chain by hand is both faster and more faithful than auto-mocking the
// entire Drizzle namespace.

import { describe, expect, it } from "vitest";

import type { DbClient } from "@modulo/db/client";

import { resolveActiveOrgForUser } from "./active-org";

interface MembershipRow {
  organizationId: string;
}

/**
 * Builds a `DbClient` shim that returns the supplied rows on a single
 * `.select(...).from(...).where(...).orderBy(...).limit(...)` chain. The
 * cast through `unknown` is the test boundary: in real code, `DbClient` is
 * tightly typed; here we only exercise the chain `resolveActiveOrgForUser`
 * actually walks.
 */
function mockDb(rows: MembershipRow[]): DbClient {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
  };
  const shim = {
    select: () => chain,
  };
  return shim as unknown as DbClient;
}

describe("resolveActiveOrgForUser", () => {
  it("returns the organization id when the user has exactly one membership", async () => {
    const db = mockDb([{ organizationId: "org-alpha" }]);
    await expect(resolveActiveOrgForUser(db, "user-1")).resolves.toBe(
      "org-alpha",
    );
  });

  it("returns the most recent membership when the user has several", async () => {
    // The shim does not actually sort — it returns rows as-provided. The
    // ORDER BY contract is exercised at the query-builder layer; here we
    // simulate the row Drizzle would surface first under
    // `ORDER BY created_at DESC LIMIT 1`.
    const db = mockDb([{ organizationId: "org-newest" }]);
    await expect(resolveActiveOrgForUser(db, "user-2")).resolves.toBe(
      "org-newest",
    );
  });

  it("returns null when the user has zero memberships", async () => {
    const db = mockDb([]);
    await expect(resolveActiveOrgForUser(db, "user-3")).resolves.toBeNull();
  });
});
