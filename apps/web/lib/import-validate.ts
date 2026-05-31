// apps/web/lib/import-validate.ts
//
// Pure helpers for validating mapped draft rows (Phase 3 of the CSV/XLSX import
// flow). No React, no next-intl, no fetch — fully testable in a bare Vitest
// environment.
//
// DESIGN DECISIONS:
//   - `parseAmount` is tolerant of French locale number formatting: regular
//     spaces, non-breaking spaces (NBSP U+00A0), narrow NBSP (U+202F), and
//     thin spaces (U+2009) are all treated as thousands separators and stripped.
//     A comma decimal separator is normalised to a dot before Number() coercion.
//   - `resolveStageValue` builds a lookup table (STAGE_FR_LABELS) hardcoded
//     against the FR i18n messages in fr.json. The LUT is intentionally NOT
//     loaded from next-intl at runtime so this file stays isomorphic-pure and
//     testable under bare Node/Vitest without the Next.js i18n runtime.
//   - `validateImportRow` uses Zod `.email()` for email validation, matching
//     the rest of the codebase (contactCreateSchema in schemas.ts).
//   - Error discrimination for AMOUNT_NEGATIVE vs AMOUNT_INVALID: after
//     parseAmount returns null, a second lightweight pass checks whether the
//     normalised string starts with "-" to distinguish the two cases. This
//     avoids a second full parse and keeps the logic readable.

import { z } from "zod";

import { STAGES } from "@modulo/sales-analytics/lib/stages";
import type { DealStage } from "@modulo/sales-analytics/schemas";

import { normaliseForMatch } from "./import-mapping";
import type { DealTargetKey } from "./import-mapping";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Discriminated union of every row-level error this validator can emit.
 * Codes are stable identifiers — mapped to i18n messages by the UI layer.
 */
export type ImportRowErrorCode =
  | "NAME_REQUIRED"
  | "AMOUNT_REQUIRED"
  | "AMOUNT_INVALID"
  | "AMOUNT_NEGATIVE"
  | "STAGE_REQUIRED"
  | "STAGE_INVALID"
  | "EMAIL_INVALID";

/** Row-level errors keyed by the field that failed validation. */
export type ImportRowErrors = Partial<Record<DealTargetKey, ImportRowErrorCode>>;

/** A draft row produced by `applyMapping` from Phase 2. */
export type ImportDraftRow = Partial<Record<DealTargetKey, string>>;

/** A validated row carries the typed parsed values, ready for Phase 4 mutation. */
export interface ValidatedRow {
  /** Original row index (0-based, after dropEmptyRows). */
  index: number;
  /** The original string values from the file. */
  raw: ImportDraftRow;
  valid: boolean;
  errors: ImportRowErrors;
  /** Populated only when valid === true. */
  parsed?: {
    name: string;
    amount: number; // EUR, >= 0
    stage: DealStage;
    contactName: string | null; // null if absent or empty
    contactEmail: string | null; // null if absent or empty
  };
}

/** Aggregate result of validating a full array of draft rows. */
export interface ValidationSummary {
  rows: ValidatedRow[];
  validCount: number;
  errorCount: number;
}

// ---------------------------------------------------------------------------
// Stage FR labels LUT
// ---------------------------------------------------------------------------

/**
 * Libelles d'AFFICHAGE FR synchronises avec `apps/web/messages/fr.json` sous
 * `modules.salesAnalytics.deals.stages.*`. Ces valeurs sont les libelles
 * NATURELS (avec accents) tels qu'ils apparaissent dans l'UI — ils servent
 * UNIQUEMENT pour les messages d'erreur "valeurs attendues". La resolution
 * effective passe par `normaliseForMatch` (NFD + strip combining marks) donc
 * l'utilisateur peut taper "Qualifie" OU "Qualifié" et les deux matcheront.
 *
 * Si ces libelles changent dans `fr.json`, mettre a jour cette table
 * (un test d'isomorphisme dans import-validate.test.ts verifie la coherence).
 */
export const STAGE_FR_LABELS = {
  lead: "Lead",
  qualified: "Qualifié",
  proposal: "Proposition",
  won: "Gagné",
  lost: "Perdu",
} as const satisfies Record<DealStage, string>;

// ---------------------------------------------------------------------------
// Whitespace regex — written as Unicode escapes to satisfy no-irregular-whitespace
// ---------------------------------------------------------------------------

/**
 * Matches all whitespace variants used as thousands separators in French locale
 * number formatting:
 *   - U+0020 regular space
 *   - U+00A0 non-breaking space (NBSP) — most common in Excel FR exports
 *   - U+202F narrow non-breaking space — used by some French locale formatters
 *   - U+2009 thin space
 *   - \s     any other Unicode whitespace
 *
 * Written as explicit Unicode escapes to avoid ESLint no-irregular-whitespace
 * errors that occur when these characters appear as literals in source code.
 */

const WHITESPACE_RE = /[\s\u00A0\u202F\u2009]+/g;

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Parses a FR-tolerant amount string into a non-negative number.
 *
 *   "45 000,50"   -> 45000.5  (regular space)
 *   "45[NBSP]000,50" -> 45000.5  (NBSP U+00A0 -- common in Excel FR exports)
 *   "1[NNBSP]234,56"  -> 1234.56  (narrow NBSP U+202F)
 *   "1[THINSP]000"     -> 1000     (thin space U+2009)
 *   "1234.56"     -> 1234.56
 *   "0"           -> 0        (zero is valid -- free deal tracking)
 *   "-50"         -> null     (negative is invalid)
 *   "abc"         -> null
 *   ""            -> null
 *
 * Strips ALL whitespace categories (regular space, NBSP, narrow NBSP,
 * thin space). Converts comma decimal separator to dot.
 * No strict regex on the format before the strip -- tolerates
 * "1 234,5", "1234.56", "1 234 567,89".
 */
export function parseAmount(raw: string): number | null {
  if (raw === "") return null;

  // Strip all whitespace variants — regex is defined above with Unicode escapes.
  const stripped = raw.replace(WHITESPACE_RE, "");

  if (stripped === "") return null;

  // Normalise comma decimal separator to dot.
  const normalised = stripped.replace(",", ".");

  // After normalisation there should be at most one dot.
  // A string like "12,34,56" -> "12.34.56" is still NaN after Number().
  const value = Number(normalised);

  if (Number.isNaN(value)) return null;
  if (value < 0) return null;

  return value;
}

/**
 * Resolves a stage value from the file (either the enum id or the FR label,
 * case-insensitive, accent-insensitive) to a canonical DealStage.
 *
 *   "lead"        -> "lead"
 *   "LEAD"        -> "lead"
 *   "Qualifie"    -> "qualified"
 *   "qualifie"    -> "qualified" (accent stripped)
 *   "Proposition" -> "proposal"
 *   "Gagne"       -> "won"
 *   "perdu"       -> "lost"
 *   "unknown"     -> null
 *   ""            -> null
 *
 * Uses `normaliseForMatch` from `import-mapping.ts` for normalisation parity.
 */
export function resolveStageValue(raw: string): DealStage | null {
  const normRaw = normaliseForMatch(raw);
  if (normRaw === "") return null;

  for (const stage of STAGES) {
    const normId = normaliseForMatch(stage.id);
    const normLabel = normaliseForMatch(STAGE_FR_LABELS[stage.id]);

    if (normRaw === normId || normRaw === normLabel) {
      return stage.id;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Zod email schema — reused from schemas.ts pattern
// ---------------------------------------------------------------------------

const emailSchema = z.string().email();

// ---------------------------------------------------------------------------
// Row validator
// ---------------------------------------------------------------------------

/**
 * Validates a single mapped draft row.
 *
 * Returns:
 *   - `{ valid: true, parsed: {...} }` when every required field passes
 *   - `{ valid: false, errors: {...} }` otherwise (one code per failing field)
 *
 * `contact_name` and `contact_email` are optional -- empty/undefined produces
 * no error. If `contact_email` is present and non-empty, it must be a valid
 * RFC-5322 email (validated via Zod `.email()`).
 */
export function validateImportRow(
  draft: ImportDraftRow,
  index: number,
): ValidatedRow {
  const errors: ImportRowErrors = {};

  // ---- name ----
  const rawName = draft.name?.trim() ?? "";
  if (rawName === "") {
    errors.name = "NAME_REQUIRED";
  }

  // ---- amount ----
  const rawAmount = draft.amount;
  let parsedAmount: number | null = null;

  if (rawAmount === undefined || rawAmount.trim() === "") {
    errors.amount = "AMOUNT_REQUIRED";
  } else {
    parsedAmount = parseAmount(rawAmount);
    if (parsedAmount === null) {
      // Discriminate AMOUNT_NEGATIVE vs AMOUNT_INVALID:
      // Strip whitespace from raw string and check for a leading minus sign.
      const stripped = rawAmount.replace(WHITESPACE_RE, "").replace(",", ".");
      if (stripped.startsWith("-")) {
        errors.amount = "AMOUNT_NEGATIVE";
      } else {
        errors.amount = "AMOUNT_INVALID";
      }
    }
  }

  // ---- stage ----
  const rawStage = draft.stage;
  let parsedStage: DealStage | null = null;

  if (rawStage === undefined || rawStage.trim() === "") {
    errors.stage = "STAGE_REQUIRED";
  } else {
    parsedStage = resolveStageValue(rawStage);
    if (parsedStage === null) {
      errors.stage = "STAGE_INVALID";
    }
  }

  // ---- contact_email (optional) ----
  const rawEmail = draft.contact_email?.trim() ?? "";
  let parsedEmail: string | null = null;

  if (rawEmail !== "") {
    const result = emailSchema.safeParse(rawEmail);
    if (!result.success) {
      errors.contact_email = "EMAIL_INVALID";
    } else {
      parsedEmail = rawEmail;
    }
  }

  // ---- contact_name (optional) ----
  const rawContactName = draft.contact_name?.trim() ?? "";
  const parsedContactName = rawContactName !== "" ? rawContactName : null;

  // ---- Result ----
  const hasErrors = Object.keys(errors).length > 0;

  if (hasErrors) {
    return { index, raw: draft, valid: false, errors };
  }

  // All required fields passed -- populate parsed values.
  return {
    index,
    raw: draft,
    valid: true,
    errors: {},
    parsed: {
      name: rawName,
      amount: parsedAmount!, // non-null because errors.amount is unset
      stage: parsedStage!, // non-null because errors.stage is unset
      contactName: parsedContactName,
      contactEmail: parsedEmail,
    },
  };
}

/**
 * Validates an entire array of mapped draft rows in one pass.
 * Returns the per-row results AND aggregate counters for the UI summary.
 * O(n) without parasitic allocations.
 */
export function validateImportRows(
  drafts: readonly ImportDraftRow[],
): ValidationSummary {
  let validCount = 0;
  let errorCount = 0;

  const rows = drafts.map((draft, i) => {
    const result = validateImportRow(draft, i);
    if (result.valid) {
      validCount++;
    } else {
      errorCount++;
    }
    return result;
  });

  return { rows, validCount, errorCount };
}
