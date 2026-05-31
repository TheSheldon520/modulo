// modules/sales-analytics/__tests__/import-contact-resolution.test.ts
//
// Unit tests for the pure contact-resolution helpers.
// No Drizzle, no DB — fully isolated.

import { describe, expect, it } from "vitest";

import {
  normaliseEmailKey,
  normaliseNameKey,
  resolveContactsForImport,
} from "../lib/import-contact-resolution";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Sequential id factory for deterministic test assertions. */
function makeIdGen() {
  let counter = 0;
  return () => `test-${++counter}`;
}

// ---------------------------------------------------------------------------
// normaliseEmailKey
// ---------------------------------------------------------------------------

describe("normaliseEmailKey", () => {
  it("lowercases and trims a well-formed email", () => {
    expect(normaliseEmailKey("Foo@Bar.com")).toBe("foo@bar.com");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseEmailKey("  alice@acme.fr  ")).toBe("alice@acme.fr");
  });

  it("handles mixed-case TLD", () => {
    expect(normaliseEmailKey("Alice@Acme.FR")).toBe("alice@acme.fr");
  });

  it("returns null for empty string", () => {
    expect(normaliseEmailKey("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normaliseEmailKey("   ")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normaliseEmailKey(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normaliseEmailKey(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normaliseNameKey
// ---------------------------------------------------------------------------

describe("normaliseNameKey", () => {
  it("lowercases a simple name", () => {
    expect(normaliseNameKey("Acme Corp")).toBe("acme corp");
  });

  it("trims leading/trailing spaces and collapses internal whitespace", () => {
    expect(normaliseNameKey("  Acme   Corp  ")).toBe("acme corp");
  });

  it("lowercases an all-caps name", () => {
    expect(normaliseNameKey("ACME")).toBe("acme");
  });

  it("returns null for empty string", () => {
    expect(normaliseNameKey("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normaliseNameKey("   ")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normaliseNameKey(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normaliseNameKey(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveContactsForImport — core behaviour
// ---------------------------------------------------------------------------

describe("resolveContactsForImport", () => {
  // ---- Empty / trivial inputs ----

  it("returns empty arrays and zero counters for empty input", () => {
    const result = resolveContactsForImport([], [], { idGen: makeIdGen() });
    expect(result.resolutions).toHaveLength(0);
    expect(result.toCreate).toHaveLength(0);
    expect(result.counters).toEqual({ linkedCount: 0, createdCount: 0, nullCount: 0 });
  });

  it("creates contacts for all rows when existingContacts is empty", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: "Alice", email: "alice@x.com" },
        { name: "Bob", email: "bob@x.com" },
        { name: "Carol", email: "carol@x.com" },
      ],
      [],
      { idGen },
    );
    expect(result.resolutions).toHaveLength(3);
    expect(result.toCreate).toHaveLength(3);
    expect(result.counters).toEqual({ linkedCount: 0, createdCount: 3, nullCount: 0 });
    // All resolutions should be new
    for (const r of result.resolutions) {
      expect(r.isNew).toBe(true);
      expect(r.contactId).not.toBeNull();
    }
  });

  // ---- null contact (no name, no email) ----

  it("sets contactId=null and isNew=false for rows with neither name nor email", () => {
    const result = resolveContactsForImport(
      [{ name: null, email: null }],
      [],
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: null, isNew: false });
    expect(result.toCreate).toHaveLength(0);
    expect(result.counters.nullCount).toBe(1);
  });

  it("treats empty-string email and null name as no-contact row", () => {
    const result = resolveContactsForImport(
      [{ name: undefined, email: "" }],
      [],
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: null, isNew: false });
    expect(result.counters.nullCount).toBe(1);
  });

  // ---- Email match against existing ----

  it("links to an existing contact matched by email (exact case)", () => {
    const existing = [{ id: "existing-1", name: "Alice", email: "alice@acme.com" }];
    const result = resolveContactsForImport(
      [{ name: "Alice", email: "alice@acme.com" }],
      existing,
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: "existing-1", isNew: false });
    expect(result.toCreate).toHaveLength(0);
    expect(result.counters.linkedCount).toBe(1);
    expect(result.counters.createdCount).toBe(0);
  });

  it("matches existing contact by email case-insensitively", () => {
    const existing = [{ id: "existing-1", name: "Alice", email: "alice@acme.com" }];
    const result = resolveContactsForImport(
      [{ name: "Alice", email: "ALICE@ACME.COM" }],
      existing,
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: "existing-1", isNew: false });
    expect(result.counters.linkedCount).toBe(1);
  });

  it("does NOT match existing contact by name when input has a non-matching email", () => {
    // Input has email → only email match attempted; unrecognised email → create new
    const existing = [{ id: "existing-1", name: "Alice", email: null }];
    const result = resolveContactsForImport(
      [{ name: "Alice", email: "alice@unknown.com" }],
      existing,
      { idGen: makeIdGen() },
    );
    // Email doesn't match any existing → create new (not linked to existing-1)
    expect(result.resolutions[0]?.isNew).toBe(true);
    expect(result.counters.linkedCount).toBe(0);
    expect(result.toCreate).toHaveLength(1);
  });

  // ---- Name match against existing ----

  it("links to an existing contact matched by name when no email is provided", () => {
    const existing = [{ id: "existing-2", name: "Acme Corp", email: null }];
    const result = resolveContactsForImport(
      [{ name: "Acme Corp", email: null }],
      existing,
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: "existing-2", isNew: false });
    expect(result.counters.linkedCount).toBe(1);
    expect(result.toCreate).toHaveLength(0);
  });

  it("matches existing contact by name case-insensitively with whitespace collapse", () => {
    const existing = [{ id: "existing-3", name: "Acme Corp", email: null }];
    const result = resolveContactsForImport(
      [{ name: "  ACME   CORP  ", email: null }],
      existing,
      { idGen: makeIdGen() },
    );
    expect(result.resolutions[0]).toEqual({ contactId: "existing-3", isNew: false });
  });

  // ---- Create new contact (no match) ----

  it("creates a new contact when email is unknown to the org", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [{ name: "New Person", email: "new@org.com" }],
      [],
      { idGen },
    );
    expect(result.toCreate).toHaveLength(1);
    const created = result.toCreate[0];
    expect(created?.id).toBe("test-1");
    expect(created?.email).toBe("new@org.com");
    expect(created?.name).toBe("New Person");
    expect(result.resolutions[0]).toEqual({ contactId: "test-1", isNew: true });
  });

  // ---- Intra-batch dedup by email ----

  it("deduplicates two rows with the same email into one toCreate entry", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: "Alpha", email: "shared@x.com" },
        { name: "Beta", email: "shared@x.com" },
      ],
      [],
      { idGen },
    );
    expect(result.toCreate).toHaveLength(1);
    expect(result.toCreate[0]?.name).toBe("Alpha"); // first-wins
    expect(result.resolutions[0]?.contactId).toBe(result.resolutions[1]?.contactId);
    expect(result.counters.createdCount).toBe(1);
  });

  it("deduplicates case-insensitive same email intra-batch", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: "Alpha", email: "x@y.com" },
        { name: "Beta", email: "X@Y.COM" },
      ],
      [],
      { idGen },
    );
    expect(result.toCreate).toHaveLength(1);
    expect(result.toCreate[0]?.name).toBe("Alpha"); // first-wins
    expect(result.resolutions[0]?.contactId).toBe(result.resolutions[1]?.contactId);
  });

  // ---- Intra-batch dedup by name (no email) ----

  it("deduplicates two rows with the same name (no email) into one toCreate entry", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: "Same Person", email: null },
        { name: "Same Person", email: null },
      ],
      [],
      { idGen },
    );
    expect(result.toCreate).toHaveLength(1);
    expect(result.resolutions[0]?.contactId).toBe(result.resolutions[1]?.contactId);
    expect(result.counters.createdCount).toBe(1);
  });

  // ---- Order preserved ----

  it("preserves input order in resolutions array", () => {
    const existing = [{ id: "ex-1", name: "Existing", email: "ex@x.com" }];
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: null, email: null },              // null → index 0
        { name: "Existing", email: "ex@x.com" }, // linked → index 1
        { name: "New", email: "new@x.com" },     // created → index 2
      ],
      existing,
      { idGen },
    );
    expect(result.resolutions[0]).toEqual({ contactId: null, isNew: false });
    expect(result.resolutions[1]).toEqual({ contactId: "ex-1", isNew: false });
    expect(result.resolutions[2]?.isNew).toBe(true);
    expect(result.resolutions[2]?.contactId).toBe("test-1");
  });

  // ---- Mixed scenario ----

  it("handles a mixed batch: 2 existing + 2 new deduplicated + 1 null", () => {
    const existing = [
      { id: "ex-A", name: "Alice", email: "alice@x.com" },
      { id: "ex-B", name: "Bob", email: "bob@x.com" },
    ];
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [
        { name: "Alice", email: "alice@x.com" },  // linked to ex-A
        { name: "Bob", email: "bob@x.com" },       // linked to ex-B
        { name: "Carol", email: "carol@x.com" },   // new (dedup 1st)
        { name: "Carol", email: "carol@x.com" },   // new (dedup 2nd → same id)
        { name: null, email: null },                // null
      ],
      existing,
      { idGen },
    );
    expect(result.counters.linkedCount).toBe(2);
    expect(result.counters.createdCount).toBe(1);
    expect(result.counters.nullCount).toBe(1);
    expect(result.toCreate).toHaveLength(1);
    expect(result.resolutions[2]?.contactId).toBe(result.resolutions[3]?.contactId);
    expect(result.resolutions[4]).toEqual({ contactId: null, isNew: false });
  });

  // ---- Edge: email="", name present → treat as name-only row ----

  it("treats empty-string email as absent and falls back to name matching", () => {
    const existing = [{ id: "ex-1", name: "Known Person", email: null }];
    const result = resolveContactsForImport(
      [{ name: "Known Person", email: "" }],
      existing,
      { idGen: makeIdGen() },
    );
    // email "" normalises to null → falls through to name matching → match ex-1
    expect(result.resolutions[0]).toEqual({ contactId: "ex-1", isNew: false });
    expect(result.counters.linkedCount).toBe(1);
  });

  // ---- linkedCount distinct-contact semantics ----

  it("derives row-level linked count from resolutions, not counters.linkedCount", () => {
    // 3 rows all pointing to the same existing contact → linkedCount = 1 (distinct)
    // but row-level count = 3. Documents that the two values diverge.
    const existing = [{ id: "ex-1", name: "Alice", email: "alice@x.com" }];
    const idGen = makeIdGen();
    const inputs = [
      { name: "Alice", email: "alice@x.com" },  // linked to ex-1
      { name: "Alice", email: "alice@x.com" },  // linked to ex-1 (same)
      { name: "Alice", email: "alice@x.com" },  // linked to ex-1 (same)
    ];
    const result = resolveContactsForImport(inputs, existing, { idGen });

    // linkedCount counts distinct pre-existing contacts, not rows
    expect(result.counters.linkedCount).toBe(1);

    // Row-level linked count must be derived from resolutions
    const rowLevelLinked = result.resolutions.filter(
      (r) => r.contactId !== null && !r.isNew,
    ).length;
    expect(rowLevelLinked).toBe(3);
    expect(rowLevelLinked).toBeGreaterThan(result.counters.linkedCount);
  });

  it("dedup linkedCount: multiple rows linking to same existing contact count as 1", () => {
    // 3 rows with same email, 1 existing contact → linkedCount must be 1
    const existing = [{ id: "c1", name: "Shared", email: "shared@acme.com" }];
    const result = resolveContactsForImport(
      [
        { name: "Shared", email: "shared@acme.com" },
        { name: "Shared", email: "shared@acme.com" },
        { name: "Shared", email: "shared@acme.com" },
      ],
      existing,
      { idGen: makeIdGen() },
    );
    expect(result.counters.linkedCount).toBe(1);
    expect(result.counters.createdCount).toBe(0);
    expect(result.counters.nullCount).toBe(0);
    for (const r of result.resolutions) {
      expect(r.contactId).toBe("c1");
      expect(r.isNew).toBe(false);
    }
  });

  it("distinct linkedCount: 5 rows linking to 3 existing contacts", () => {
    const existing = [
      { id: "c-alice", name: "Alice", email: "alice@acme.com" },
      { id: "c-bob", name: "Bob", email: "bob@acme.com" },
      { id: "c-charlie", name: "Charlie", email: "charlie@acme.com" },
    ];
    const result = resolveContactsForImport(
      [
        { name: "Alice", email: "alice@acme.com" },    // → c-alice
        { name: "Alice", email: "alice@acme.com" },    // → c-alice (same)
        { name: "Bob", email: "bob@acme.com" },        // → c-bob
        { name: "Bob", email: "bob@acme.com" },        // → c-bob (same)
        { name: "Charlie", email: "charlie@acme.com" }, // → c-charlie
      ],
      existing,
      { idGen: makeIdGen() },
    );
    // 5 rows, but only 3 distinct existing contacts matched → linkedCount = 3
    expect(result.counters.linkedCount).toBe(3);
    expect(result.counters.createdCount).toBe(0);
    expect(result.counters.nullCount).toBe(0);
    expect(result.resolutions).toHaveLength(5);
  });

  // ---- toCreate name: email-only row uses email as name fallback ----

  it("uses email as name fallback when input has email but no name", () => {
    const idGen = makeIdGen();
    const result = resolveContactsForImport(
      [{ name: null, email: "noname@x.com" }],
      [],
      { idGen },
    );
    const created = result.toCreate[0];
    expect(created).toBeDefined();
    // name falls back to the email string (non-null name required by DB)
    expect(created?.name).toBe("noname@x.com");
    expect(created?.email).toBe("noname@x.com");
  });
});
