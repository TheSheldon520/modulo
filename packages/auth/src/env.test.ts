// packages/auth/src/env.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { requireEnv } from "./env";

const KEY = "__MODULO_TEST_ENV_VAR__";

describe("requireEnv", () => {
  beforeEach(() => {
    delete process.env[KEY];
  });

  afterEach(() => {
    delete process.env[KEY];
  });

  it("returns the value when the env var is set", () => {
    process.env[KEY] = "hello";
    expect(requireEnv(KEY)).toBe("hello");
  });

  it("throws when the env var is missing", () => {
    expect(() => requireEnv(KEY)).toThrowError(
      /__MODULO_TEST_ENV_VAR__ is not set/,
    );
  });

  it("throws when the env var is empty (treated as unset)", () => {
    process.env[KEY] = "";
    expect(() => requireEnv(KEY)).toThrowError(
      /__MODULO_TEST_ENV_VAR__ is not set/,
    );
  });
});
