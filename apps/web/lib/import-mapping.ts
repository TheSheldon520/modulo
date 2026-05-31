// apps/web/lib/import-mapping.ts
//
// Pure helpers for mapping CSV/XLSX column headers to deal target fields.
// No React, no side-effects — fully testable in a bare Vitest environment.
//
// DESIGN DECISIONS:
//   - `normaliseForMatch` strips diacritics, lowercases, and normalises
//     separators so that "Contact Email ", "contact_email", "Contact-Email"
//     all match the synonym "contact email".
//   - Auto-detection is greedy: first header that matches a synonym wins.
//     Duplicate headers (same string twice) → the first occurrence wins.
//   - Multiple target fields can map to the same file header (not blocked
//     here — the UI may warn, but the lib does not enforce uniqueness).
//   - UNMAPPED is a non-empty sentinel required by Radix Select (which
//     forbids value=""). This follows the pattern of NO_CONTACT /
//     ALL_OWNERS used elsewhere in the sales-analytics module.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DealTargetField {
  key: string;
  required: boolean;
  synonyms: readonly string[];
}

export type DealTargetKey = (typeof DEAL_TARGET_FIELDS)[number]["key"];

/**
 * Sentinel value for "not mapped" in the dropdown.
 * Radix Select forbids value="" — this non-empty sentinel avoids that.
 */
export const UNMAPPED = "__unmapped__";

/**
 * Mapping of target deal field keys → file header strings (or UNMAPPED).
 */
export type ColumnMapping = Record<DealTargetKey, string>;

// ---------------------------------------------------------------------------
// Target fields definition
// ---------------------------------------------------------------------------

/**
 * The canonical list of deal fields the importer maps to.
 * `required: true` fields must all be mapped for the "Continuer" button to
 * be enabled (enforced by `isMappingComplete`).
 *
 * Phase 3 will add Zod validators per field alongside these definitions.
 */
export const DEAL_TARGET_FIELDS = [
  {
    key: "name",
    required: true,
    synonyms: ["name", "nom", "intitule", "deal"],
  },
  {
    key: "amount",
    required: true,
    synonyms: ["amount", "montant", "valeur", "prix"],
  },
  {
    key: "stage",
    required: true,
    synonyms: ["stage", "etape", "statut", "status"],
  },
  {
    key: "contact_name",
    required: false,
    synonyms: [
      "contact_name",
      "contact",
      "contact_nom",
      "nom_contact",
      "nom du contact",
    ],
  },
  {
    key: "contact_email",
    required: false,
    synonyms: [
      "contact_email",
      "email",
      "mail",
      "e-mail",
      "contact email",
      "email contact",
    ],
  },
] as const satisfies readonly DealTargetField[];

// ---------------------------------------------------------------------------
// Normaliser
// ---------------------------------------------------------------------------

/**
 * Normalises a string for fuzzy matching:
 *   - trim leading/trailing whitespace
 *   - lowercase
 *   - strip diacritics (NFD decomposition + remove combining marks U+0300..U+036F)
 *   - replace underscores and hyphens with a space
 *   - collapse runs of whitespace to a single space
 *
 * Examples:
 *   "Contact Email " → "contact email"
 *   "Étape"         → "etape"
 *   "nom_contact"   → "nom contact"
 *   "E-mail"        → "e mail"
 */
export function normaliseForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/[_-]+/g, " ") // underscores and hyphens → space
    .replace(/\s+/g, " ") // collapse whitespace runs
    .trim(); // trim again after replacements (e.g. leading/trailing "_")
}

// ---------------------------------------------------------------------------
// Auto-detection
// ---------------------------------------------------------------------------

/**
 * Auto-detects column mapping by normalised fuzzy matching.
 *
 * For each target field, iterates the `headers` array and returns the first
 * header whose normalised form matches any of the target's synonyms.
 * Returns UNMAPPED for fields where no match is found.
 *
 * Complexity: O(targets × headers × synonyms) — negligible for real files
 * (typically < 50 headers, 5 targets, ≤ 6 synonyms each).
 */
export function detectColumnMapping(
  headers: readonly string[],
  targetFields: readonly DealTargetField[] = DEAL_TARGET_FIELDS,
): ColumnMapping {
  const mapping: Record<string, string> = {};

  for (const field of targetFields) {
    const normSynonyms = field.synonyms.map(normaliseForMatch);
    let matched = UNMAPPED;

    for (const header of headers) {
      const normHeader = normaliseForMatch(header);
      if (normSynonyms.includes(normHeader)) {
        matched = header;
        break; // first match wins — duplicate headers: first occurrence wins
      }
    }

    mapping[field.key] = matched;
  }

  return mapping as ColumnMapping;
}

// ---------------------------------------------------------------------------
// Apply mapping
// ---------------------------------------------------------------------------

/**
 * Applies a mapping to an array of parsed rows, re-keying each row by
 * target field key instead of raw file header.
 *
 * - Fields mapped to UNMAPPED are omitted from the output rows (absent key,
 *   not `undefined`).
 * - File headers not referenced in the mapping are silently ignored.
 * - Phase 3 will wrap the output of this function in Zod validation.
 */
export function applyMapping(
  rows: readonly Record<string, string>[],
  mapping: ColumnMapping,
): Partial<Record<DealTargetKey, string>>[] {
  return rows.map((row) => {
    const draft: Partial<Record<DealTargetKey, string>> = {};

    for (const [targetKey, fileHeader] of Object.entries(mapping)) {
      if (fileHeader === UNMAPPED) continue; // skip unmapped fields
      const value = row[fileHeader];
      if (value !== undefined) {
        draft[targetKey as DealTargetKey] = value;
      }
    }

    return draft;
  });
}

// ---------------------------------------------------------------------------
// Completeness guard
// ---------------------------------------------------------------------------

/**
 * Returns true iff every required target field is mapped (value !== UNMAPPED).
 * Used by the ImportMapping component to enable/disable the "Continuer" button.
 */
export function isMappingComplete(
  mapping: ColumnMapping,
  targetFields: readonly DealTargetField[] = DEAL_TARGET_FIELDS,
): boolean {
  return targetFields
    .filter((f) => f.required)
    .every((f) => mapping[f.key as DealTargetKey] !== UNMAPPED);
}
