// apps/web/lib/i18n-parity.test.ts
//
// Structural parity test between the FR and EN message catalogs.
//
// Why this exists
// ---------------
// next-intl validates message *consumption* at runtime, but a missing key in
// EN only blows up when someone actually switches the runtime locale to "en"
// — which today never happens (locale is hardcoded to "fr"). To avoid a
// silent drift that would surface only in Phase 1 (locale switcher), we
// assert that both catalogs expose the exact same set of leaf paths.
//
// What counts as a leaf
// ---------------------
// A node is *descended into* only when:
//   - it is a plain object (not null, not Array)
//   - **all** of its own values are plain objects or strings
// Anything else (a string, or a heterogeneous object) is a leaf. This rule
// matters for ICU plural strings like
//   "{count, plural, =1 {1 ligne} other {{count} lignes}}"
// which parse as `string` JSON values, so they are correctly treated as
// leaves and not as nested objects.
//
// We compare the SETS of leaf paths, not the values themselves — the values
// obviously differ between languages.

import { describe, expect, it } from "vitest";

import enMessages from "../messages/en.json";
import frMessages from "../messages/fr.json";

type Json = string | number | boolean | null | Json[] | JsonObject;
interface JsonObject {
  [key: string]: Json;
}

function isPlainObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Walk a message catalog and return the set of leaf paths.
 * A leaf is any node that is not a plain object whose own values are *all*
 * either strings or plain objects (heterogeneous objects are leaves too,
 * which guards against the catalog being shaped by mistake).
 */
function collectLeafPaths(node: Json, prefix: string, sink: Set<string>): void {
  if (!isPlainObject(node)) {
    sink.add(prefix);
    return;
  }

  const entries = Object.entries(node);
  // If the node is empty, treat it as a leaf — comparing empty objects across
  // locales is still meaningful (presence of the key matters).
  if (entries.length === 0) {
    sink.add(prefix);
    return;
  }

  // Only descend when every value is itself a plain object or a string. This
  // is what protects us from accidentally walking into ICU strings.
  const everyChildIsObjectOrString = entries.every(
    ([, value]) => isPlainObject(value) || typeof value === "string",
  );
  if (!everyChildIsObjectOrString) {
    sink.add(prefix);
    return;
  }

  for (const [key, value] of entries) {
    const childPath = prefix === "" ? key : `${prefix}.${key}`;
    collectLeafPaths(value, childPath, sink);
  }
}

describe("i18n parity (fr ⇄ en)", () => {
  const frPaths = new Set<string>();
  const enPaths = new Set<string>();
  collectLeafPaths(frMessages as Json, "", frPaths);
  collectLeafPaths(enMessages as Json, "", enPaths);

  it("fr.json and en.json expose the same set of leaf paths", () => {
    const onlyInFr = [...frPaths].filter((path) => !enPaths.has(path)).sort();
    const onlyInEn = [...enPaths].filter((path) => !frPaths.has(path)).sort();

    expect(
      { onlyInFr, onlyInEn },
      `\nKeys only in fr (${onlyInFr.length}):\n${onlyInFr.join("\n")}\n\nKeys only in en (${onlyInEn.length}):\n${onlyInEn.join("\n")}\n`,
    ).toEqual({ onlyInFr: [], onlyInEn: [] });
  });

  it("collects a non-trivial number of leaves (sanity check)", () => {
    // Guard against a future regression where the walker silently returns an
    // empty set (e.g. someone refactors `isPlainObject` to be too strict).
    // Threshold tuned to ~70% of the current catalog size (≈ 260 leaves as of
    // 2026-06) so the test catches a meaningful shrinkage while leaving room
    // for minor cleanup without churn. Raise alongside the catalog if needed.
    expect(frPaths.size).toBeGreaterThan(180);
    expect(enPaths.size).toBeGreaterThan(180);
  });
});
