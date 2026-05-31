// apps/web/lib/import-parse.ts
//
// Pure helpers for parsing CSV / XLSX / XLS files client-side.
// No React, no I/O side-effects — fully testable in a bare Vitest environment.
//
// DESIGN DECISION — exception vs Result pattern:
//   We use a custom `ImportParseException extends Error` with a structured
//   `.cause: ImportParseError` property. Rationale:
//     1. Idiomatic TypeScript async/await — callers use try/catch naturally.
//     2. The structured `.cause` carries the discriminated union so UI can
//        dispatch on it without instanceof checks for each code.
//     3. More testable than an Either monad given the rest of the codebase
//        already uses thrown errors (tRPC, Next.js redirect, etc.).
//
// DYNAMIC IMPORTS:
//   papaparse and xlsx are loaded on-demand (`await import(...)`) so they
//   do NOT appear in the initial bundle. This is intentional — the import
//   page is not on the critical path of every route.
//
// xlsx@0.18.5 : CVE prototype-pollution non exploitable ici car parsing
// 100 % client-side sur fichier uploadé par l'utilisateur lui-même, jamais
// server-side. Migration tracée si parsing XLSX devient server-side.
//
// ENCODING NOTE (Phase 1):
//   We use UTF-8 by default for both CSV and XLSX. Some Excel FR exports may
//   use Latin-1 / Windows-1252 encoding, which can cause accented characters
//   to appear as garbage. This is a known limitation of Phase 1; a
//   robust encoding-detection pass (using chardet or TextDecoder with a
//   BOM probe) is scheduled for Phase 5.

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  /** Convenience alias — always equals rows.length */
  rowCount: number;
  /** XLSX only — name of the first (parsed) sheet */
  sheetName?: string;
}

export type ImportParseError =
  | { code: "UNSUPPORTED_FORMAT"; extension: string | null }
  | { code: "EMPTY_FILE" }
  | { code: "PARSE_FAILED"; detail: string }
  | { code: "FILE_TOO_LARGE" };

// ---------------------------------------------------------------------------
// Custom exception
// ---------------------------------------------------------------------------

export class ImportParseException extends Error {
  // `noImplicitOverride: true` requires the `override` keyword on `name`
  // because `Error` declares it as a writable property.
  override readonly name = "ImportParseException";

  // We use `importError` instead of `cause` to avoid a conflict with the
  // ES2022 `Error.cause: unknown` property — narrowing the type to
  // `ImportParseError` on an override is not structurally compatible with
  // `unknown` under `noImplicitOverride`.
  readonly importError: ImportParseError;

  constructor(importError: ImportParseError) {
    super(`ImportParseException: ${importError.code}`);
    this.importError = importError;
  }
}

/**
 * Narrows an unknown thrown value to an `ImportParseError`.
 * Call this in catch blocks that wrap `parseImportFile`.
 */
export function extractImportParseError(err: unknown): ImportParseError {
  if (err instanceof ImportParseException) {
    return err.importError;
  }
  const detail =
    err instanceof Error ? err.message : "Unknown error during parsing";
  return { code: "PARSE_FAILED", detail };
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Returns the format inferred from the file extension, or `null` if the
 * extension is missing / unrecognised.
 *
 * Intentionally case-insensitive: "file.CSV" and "file.csv" are both valid.
 */
export function detectFormat(
  filename: string,
): "csv" | "xlsx" | "xls" | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return null;
  const ext = filename.slice(lastDot + 1).toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "xlsx") return "xlsx";
  if (ext === "xls") return "xls";
  return null;
}

/**
 * Normalises header strings:
 *   - trims leading/trailing whitespace
 *   - collapses internal runs of whitespace to a single space
 *   - preserves original casing (user will see the headers as-is)
 *   - preserves order
 */
export function normalizeHeaders(rawHeaders: string[]): string[] {
  return rawHeaders.map((h) => h.trim().replace(/\s+/g, " "));
}

/**
 * Drops rows where every value is an empty string, undefined, or
 * whitespace-only. Preserves the order of the remaining rows.
 */
export function dropEmptyRows(
  rows: Record<string, string>[],
): Record<string, string>[] {
  return rows.filter((row) => {
    const values = Object.values(row);
    return values.some((v) => v !== undefined && v.trim() !== "");
  });
}

// ---------------------------------------------------------------------------
// Main async wrapper
// ---------------------------------------------------------------------------

/**
 * Parses a File object (CSV or XLSX/XLS) entirely client-side.
 *
 * Parsing is done with dynamic imports so the heavy libraries (papaparse,
 * xlsx) are not included in the initial bundle.
 *
 * Throws `ImportParseException` on any error. Extract the structured cause
 * with `extractImportParseError(err)`.
 *
 * NOTE: `parseImportFile` itself is not unit-tested with Vitest (which runs
 * in a Node environment) because it depends on `File`, `FileReader`, and
 * dynamic imports. The pure helpers (`detectFormat`, `normalizeHeaders`,
 * `dropEmptyRows`) are fully unit-tested instead. Integration testing of the
 * full flow is done manually in the browser.
 */
export async function parseImportFile(file: File): Promise<ParsedFile> {
  const format = detectFormat(file.name);
  if (!format) {
    throw new ImportParseException({
      code: "UNSUPPORTED_FORMAT",
      extension:
        file.name.includes(".") ? file.name.split(".").pop() ?? null : null,
    });
  }

  try {
    if (format === "csv") {
      return await parseCsv(file);
    } else {
      return await parseXlsx(file, format);
    }
  } catch (err) {
    // Re-throw ImportParseException as-is; wrap everything else.
    if (err instanceof ImportParseException) throw err;
    const detail =
      err instanceof Error ? err.message : "Unknown parsing error";
    throw new ImportParseException({ code: "PARSE_FAILED", detail });
  }
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

async function parseCsv(file: File): Promise<ParsedFile> {
  // Guard: a zero-byte file cannot yield any parseable content.
  // We throw EMPTY_FILE immediately rather than letting Papa attempt to
  // parse an empty string and produce a confusing PARSE_FAILED.
  if (file.size === 0) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  // Dynamic import — not in the initial bundle.
  const Papa = (await import("papaparse")).default;

  const text = await file.text();

  // delimiter: "" = auto-detection. CRITICAL for French Excel files that
  // use ";" as delimiter instead of ",".
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: "",
    // transformHeader: applied after normalizeHeaders below
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    // If Papa could not detect any fields, the file is blank / whitespace-only
    // (e.g. a file that only contains newlines or spaces). This maps to
    // EMPTY_FILE — "no usable rows" — rather than PARSE_FAILED ("could not
    // read the file"), which implies a structural / encoding problem.
    // A missing or empty `meta.fields` array is the reliable signal here:
    // when Papa finds a valid delimiter + header row it always populates fields.
    const hasFields =
      result.meta.fields !== undefined && result.meta.fields.length > 0;
    if (!hasFields) {
      throw new ImportParseException({ code: "EMPTY_FILE" });
    }
    throw new ImportParseException({
      code: "PARSE_FAILED",
      detail: result.errors.map((e) => e.message).join("; "),
    });
  }

  const rawHeaders: string[] = result.meta.fields ?? [];
  const headers = normalizeHeaders(rawHeaders);

  // Rebuild rows with normalised headers
  const rows: Record<string, string>[] = result.data.map((row) => {
    const normalised: Record<string, string> = {};
    rawHeaders.forEach((rawKey, i) => {
      const normKey = headers[i] ?? rawKey;
      normalised[normKey] = String(row[rawKey] ?? "");
    });
    return normalised;
  });

  const cleanRows = dropEmptyRows(rows);

  if (cleanRows.length === 0) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  return { headers, rows: cleanRows, rowCount: cleanRows.length };
}

async function parseXlsx(
  file: File,
  _format: "xlsx" | "xls",
): Promise<ParsedFile> {
  // Guard: a zero-byte file cannot contain a valid workbook.
  // XLSX.read() on an empty buffer throws an internal error that would be
  // caught and re-wrapped as PARSE_FAILED. We surface EMPTY_FILE instead.
  if (file.size === 0) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  // Dynamic import — not in the initial bundle.
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  // `header: 1` returns a 2-D array (first row = headers, rest = data).
  // `raw: false` forces string serialisation for all cells.
  // `defval: ""` fills empty cells with "" instead of undefined.
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (raw.length === 0) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  const rawHeaderRow = raw[0] ?? [];
  const headers = normalizeHeaders(rawHeaderRow.map(String));

  const rows: Record<string, string>[] = raw.slice(1).map((rowArr) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = String(rowArr[i] ?? "");
    });
    return obj;
  });

  const cleanRows = dropEmptyRows(rows);

  if (cleanRows.length === 0) {
    throw new ImportParseException({ code: "EMPTY_FILE" });
  }

  return {
    headers,
    rows: cleanRows,
    rowCount: cleanRows.length,
    sheetName,
  };
}
