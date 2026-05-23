// packages/api/src/health.test.ts
//
// Smoke test on `appRouter.health.ping`. Only the public probe is covered
// here — `dbCheck` and `whoami` need either a live DB or a mocked Drizzle
// client, both of which belong in integration tests we'll add in T0.10.

import { describe, expect, it } from "vitest";

import { appRouter } from "./router";
import type { Context } from "./trpc";
import { createCallerFactory } from "./trpc";

const createCaller = createCallerFactory(appRouter);

/**
 * Minimal ctx for tests that only exercise `publicProcedure`. The cast is
 * safe because `ping` reads none of these fields; widening the type would
 * force every future public-only test to scaffold a full ctx.
 */
function mockContext(): Context {
  return {
    db: undefined as unknown as Context["db"],
    user: null,
    session: null,
    activeOrg: null,
    enabledModules: [],
    resHeaders: new Headers(),
  };
}

describe("healthRouter.ping", () => {
  it("returns ok=true with an ISO-8601 timestamp", async () => {
    const caller = createCaller(mockContext());
    const result = await caller.health.ping();

    expect(result.ok).toBe(true);
    expect(typeof result.timestamp).toBe("string");
    // Re-parsing the returned string and reformatting must yield the same value.
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
