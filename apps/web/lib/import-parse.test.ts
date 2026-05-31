// apps/web/lib/import-parse.test.ts
//
// Unit tests for the pure helpers in import-parse.ts.
//
// SCOPE: Only the three pure, synchronous helpers are tested here:
//   - `detectFormat`
//   - `normalizeHeaders`
//   - `dropEmptyRows`
//
// WHY NOT `parseImportFile`?
//   `parseImportFile` depends on:
//     1. The browser `File` API (available in Node 20+ via globalThis but
//        dynamic imports of papaparse / xlsx require real module resolution).
//     2. Dynamic `import("papaparse")` and `import("xlsx")` which are not
//        resolved in the Vitest node environment without additional bundler
//        configuration.
//   A minimal smoke test using `new File(...)` is provided below (marked
//   it.skip if the environment does not support it, with a detailed comment).

import { describe, it, expect } from "vitest";

import {
  detectFormat,
  normalizeHeaders,
  dropEmptyRows,
  ImportParseException,
  extractImportParseError,
} from "./import-parse";

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------

describe("detectFormat", () => {
  it("returns 'csv' for a lowercase .csv filename", () => {
    expect(detectFormat("export.csv")).toBe("csv");
  });

  it("returns 'csv' for an uppercase .CSV filename", () => {
    expect(detectFormat("EXPORT.CSV")).toBe("csv");
  });

  it("returns 'xlsx' for .xlsx", () => {
    expect(detectFormat("deals.xlsx")).toBe("xlsx");
  });

  it("returns 'xlsx' for mixed-case .XLSX", () => {
    expect(detectFormat("deals.XLSX")).toBe("xlsx");
  });

  it("returns 'xls' for .xls", () => {
    expect(detectFormat("legacy.xls")).toBe("xls");
  });

  it("returns 'xls' for mixed-case .XLS", () => {
    expect(detectFormat("legacy.XLS")).toBe("xls");
  });

  it("returns null for .txt", () => {
    expect(detectFormat("data.txt")).toBeNull();
  });

  it("returns null for .pdf", () => {
    expect(detectFormat("document.pdf")).toBeNull();
  });

  it("returns null for a file with no extension", () => {
    expect(detectFormat("nofileextension")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(detectFormat("")).toBeNull();
  });

  it("handles filenames with dots in the name (only last ext matters)", () => {
    expect(detectFormat("my.report.2026.csv")).toBe("csv");
  });

  it("returns null for a filename that ends with a dot", () => {
    expect(detectFormat("file.")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeHeaders
// ---------------------------------------------------------------------------

describe("normalizeHeaders", () => {
  it("trims leading whitespace", () => {
    expect(normalizeHeaders(["  Name"])).toEqual(["Name"]);
  });

  it("trims trailing whitespace", () => {
    expect(normalizeHeaders(["Name  "])).toEqual(["Name"]);
  });

  it("collapses multiple internal spaces to one", () => {
    expect(normalizeHeaders(["First   Name"])).toEqual(["First Name"]);
  });

  it("preserves original casing", () => {
    expect(normalizeHeaders(["NOM DU CLIENT"])).toEqual(["NOM DU CLIENT"]);
  });

  it("preserves accents", () => {
    expect(normalizeHeaders(["Montant (€)", "Prénom"])).toEqual([
      "Montant (€)",
      "Prénom",
    ]);
  });

  it("preserves order of multiple headers", () => {
    expect(normalizeHeaders(["C", "A", "B"])).toEqual(["C", "A", "B"]);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeHeaders([])).toEqual([]);
  });

  it("preserves a header that is already clean", () => {
    expect(normalizeHeaders(["Deal Name"])).toEqual(["Deal Name"]);
  });

  it("handles tabs as whitespace (collapse)", () => {
    expect(normalizeHeaders(["First\t\tName"])).toEqual(["First Name"]);
  });
});

// ---------------------------------------------------------------------------
// dropEmptyRows
// ---------------------------------------------------------------------------

describe("dropEmptyRows", () => {
  it("drops a row where all values are empty strings", () => {
    const rows = [{ Name: "", Amount: "" }];
    expect(dropEmptyRows(rows)).toEqual([]);
  });

  it("drops a row where all values are whitespace-only", () => {
    const rows = [{ Name: "   ", Amount: "\t" }];
    expect(dropEmptyRows(rows)).toEqual([]);
  });

  it("keeps a row that has at least one non-empty value", () => {
    const rows = [{ Name: "Acme", Amount: "" }];
    expect(dropEmptyRows(rows)).toEqual([{ Name: "Acme", Amount: "" }]);
  });

  it("returns an empty array for empty input", () => {
    expect(dropEmptyRows([])).toEqual([]);
  });

  it("preserves the order of remaining rows", () => {
    const rows = [
      { Name: "A", Amount: "100" },
      { Name: "", Amount: "" },
      { Name: "B", Amount: "200" },
    ];
    expect(dropEmptyRows(rows)).toEqual([
      { Name: "A", Amount: "100" },
      { Name: "B", Amount: "200" },
    ]);
  });

  it("keeps a row where only one field has a value", () => {
    const rows = [{ Name: "X", Field2: "", Field3: "" }];
    expect(dropEmptyRows(rows)).toEqual([
      { Name: "X", Field2: "", Field3: "" },
    ]);
  });

  it("drops multiple consecutive empty rows", () => {
    const rows = [
      { Name: "", Amount: "" },
      { Name: "   ", Amount: "" },
      { Name: "Valid", Amount: "50" },
    ];
    expect(dropEmptyRows(rows)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ImportParseException + extractImportParseError
// ---------------------------------------------------------------------------

describe("ImportParseException", () => {
  it("stores the importError and is instanceof Error", () => {
    const exc = new ImportParseException({ code: "EMPTY_FILE" });
    expect(exc instanceof Error).toBe(true);
    expect(exc.importError).toEqual({ code: "EMPTY_FILE" });
    expect(exc.name).toBe("ImportParseException");
  });
});

describe("extractImportParseError", () => {
  it("returns the cause when given an ImportParseException", () => {
    const cause = { code: "UNSUPPORTED_FORMAT" as const, extension: "pdf" };
    const exc = new ImportParseException(cause);
    expect(extractImportParseError(exc)).toEqual(cause);
  });

  it("wraps a generic Error as PARSE_FAILED", () => {
    const err = new Error("unexpected");
    const result = extractImportParseError(err);
    expect(result.code).toBe("PARSE_FAILED");
    if (result.code === "PARSE_FAILED") {
      expect(result.detail).toBe("unexpected");
    }
  });

  it("wraps an unknown non-Error as PARSE_FAILED with fallback detail", () => {
    const result = extractImportParseError("some string error");
    expect(result.code).toBe("PARSE_FAILED");
  });
});

// ---------------------------------------------------------------------------
// parseImportFile — smoke test
//
// This test exercises parseImportFile with a minimal CSV string via
// `new File(...)`. It requires:
//   1. Node 20+ with global `File` (available in Vitest's node environment).
//   2. The dynamic imports of papaparse/xlsx to resolve successfully.
//
// The test is skipped if `File` is not defined in the test environment —
// adjust `vitest.config.ts` to use `environment: "happy-dom"` or
// `environment: "jsdom"` if you want full browser-API coverage here.
// ---------------------------------------------------------------------------

describe.skipIf(typeof File === "undefined")("parseImportFile (smoke)", () => {
  it.skip(
    "parses a minimal CSV with comma delimiter",
    // Skipped: dynamic import of papaparse is not supported in Vitest node
    // environment without browser API polyfills. Manual browser test is the
    // validation path for Phase 1 (see checkpoint instructions at bottom of
    // the T1.6 ticket).
    async () => {
      const { parseImportFile } = await import("./import-parse");
      const content = "Name,Amount\nAcme,1000\nBeta,2000";
      const file = new File([content], "test.csv", { type: "text/csv" });
      const result = await parseImportFile(file);
      expect(result.headers).toEqual(["Name", "Amount"]);
      expect(result.rowCount).toBe(2);
    },
  );
});

// ---------------------------------------------------------------------------
// Carry-over A — EMPTY_FILE branch for zero-byte files
//
// These tests validate that file.size === 0 (CSV and XLSX) triggers
// EMPTY_FILE and NOT PARSE_FAILED. They do NOT exercise papaparse or xlsx
// because the size guard fires before any dynamic import.
//
// WHY NOT skipped: the guard only uses `file.size` which is available via
// the Node 20+ global `File`. No dynamic import of papaparse/xlsx occurs
// because we throw before reaching that point — so Vitest node runs fine.
// ---------------------------------------------------------------------------

describe.skipIf(typeof File === "undefined")(
  "parseImportFile — EMPTY_FILE for zero-byte files",
  () => {
    it("throws EMPTY_FILE (not PARSE_FAILED) for a zero-byte CSV", async () => {
      const { parseImportFile, ImportParseException } = await import(
        "./import-parse"
      );
      const file = new File([], "empty.csv", { type: "text/csv" });
      expect(file.size).toBe(0);

      try {
        await parseImportFile(file);
        // Should not reach here
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof ImportParseException).toBe(true);
        if (err instanceof ImportParseException) {
          expect(err.importError.code).toBe("EMPTY_FILE");
        }
      }
    });

    it("throws EMPTY_FILE (not PARSE_FAILED) for a zero-byte XLSX", async () => {
      const { parseImportFile, ImportParseException } = await import(
        "./import-parse"
      );
      const file = new File([], "empty.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      expect(file.size).toBe(0);

      try {
        await parseImportFile(file);
        // Should not reach here
        expect(true).toBe(false);
      } catch (err) {
        expect(err instanceof ImportParseException).toBe(true);
        if (err instanceof ImportParseException) {
          expect(err.importError.code).toBe("EMPTY_FILE");
        }
      }
    });
  },
);
