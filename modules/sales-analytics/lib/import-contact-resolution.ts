// modules/sales-analytics/lib/import-contact-resolution.ts
//
// Pure isomorphic helpers for resolving import-row contacts: deduplicate
// within a single import batch and match against existing contacts in the
// org. No Drizzle, no I/O — the caller (router.ts) provides existing contacts
// already loaded from the DB; this lib computes the toCreate list + the
// per-row contactId resolution (or null if no contact info).
//
// Why a pure lib: the deduplication + matching logic is intricate (case-
// insensitive email match, fallback to name, intra-batch dedup) and benefits
// from Vitest unit tests without spinning up a DB. The router orchestrates
// the actual INSERTs in a transaction.
//
// Multi-tenant safety: not enforced here — this lib assumes the caller has
// already filtered `existingContacts` by `organizationId`. The router MUST
// pass org-scoped contacts only.

import { uuidv7 } from "uuidv7";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ContactResolutionInput {
  name?: string | null;
  email?: string | null;
}

export interface ExistingContact {
  id: string;
  name: string;
  email: string | null;
}

export interface ResolvedContact {
  /**
   * UUID v7 — either an existing contact id, or a freshly minted id for a new
   * contact. `null` when the input row has neither email nor name.
   */
  contactId: string | null;
  /** True if a new contact must be inserted (id is a fresh uuidv7). */
  isNew: boolean;
}

export interface ContactResolutionResult {
  /**
   * Per-input-row resolution. Length === inputs.length, order preserved.
   * - `contactId: null` when the input row has neither email nor name (no
   *   contact to link).
   * - `isNew: true` means the row's contactId points to a contact in
   *   `toCreate`.
   */
  resolutions: ResolvedContact[];

  /**
   * New contacts to INSERT (already deduplicated within the batch).
   * Each entry has the uuidv7 id that's also referenced in `resolutions`.
   * Ready for batch insert (caller adds organizationId at insert time).
   *
   * Name/email semantics for intra-batch dedup:
   *   - First occurrence wins. If two rows share the same normalised email key,
   *     the contact's `name` and `email` in `toCreate` come from the FIRST row
   *     in the input array. The second row's name is silently ignored — linking
   *     a contact to a deal never updates an existing contact's data.
   */
  toCreate: { id: string; name: string; email: string | null }[];

  /**
   * Aggregate counters for the response payload.
   * - `linkedCount`:  number of DISTINCT pre-existing contacts that received at
   *                   least one link in this batch (NOT the number of rows linked
   *                   to existing contacts — multiple rows linking to the same
   *                   existing contact count as 1).
   *                   Contacts CREATED during this batch (cf. toCreate) are NOT
   *                   counted here; they're accounted for in createdCount.
   * - `createdCount`: distinct NEW contacts created (=== toCreate.length).
   * - `nullCount`:    rows with no contact info → contactId = null on the deal.
   *
   * Note: linkedCount is a count of distinct contacts (not rows), so it cannot
   * be summed with nullCount/rowsPointingToCreate to reconstruct inputs.length.
   * If callers need the row-level count, derive it from
   * `resolutions.filter(r => r.contactId !== null && !r.isNew).length`.
   */
  counters: {
    linkedCount: number;
    createdCount: number;
    nullCount: number;
  };
}

// ---------------------------------------------------------------------------
// Pure normalisers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Lowercase + trim. Returns `null` for null/undefined/empty/whitespace-only.
 *
 * Used as the email match key. Strict equality after normalisation —
 * NO fuzzy matching (explicit duplicates only; fuzzy is out of scope Phase 4).
 */
export function normaliseEmailKey(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Trim + lowercase + collapse internal whitespace to a single space.
 * Returns `null` for null/undefined/empty/whitespace-only.
 *
 * Used as the name match key when email is absent.
 */
export function normaliseNameKey(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const collapsed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return collapsed.length === 0 ? null : collapsed;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolves contacts for a batch of import rows:
 *   1. Email match (case-insensitive) against `existingContacts` if email present.
 *   2. Else name match (case-insensitive, whitespace-collapsed) if name present.
 *   3. Else create a new contact (dedup'd by normalised email key, fallback name key).
 *   4. If neither name nor email → contactId = null (deal without contact).
 *
 * **Matching priority**: email takes precedence. If an input row has an email,
 * we ONLY attempt an email match against existing contacts — we do NOT fall
 * back to name-matching when the email is absent from the existing contact, to
 * avoid creating accidental links based on common names.
 *
 * **Intra-batch dedup**: two input rows with the same normalised email key
 * produce a single entry in `toCreate`, and both `resolutions` point to the
 * same `contactId`. Same rule applies to name-key dedup when email is absent.
 *
 * **First-wins rule for toCreate**: the name and email stored in `toCreate`
 * come from the first occurrence in the input array. Subsequent rows with the
 * same key reuse the id but do not update the stored values.
 *
 * @param inputs            Import rows (ContactResolutionInput[]). Read-only.
 * @param existingContacts  Org-scoped contacts already loaded from the DB.
 *                          Caller MUST filter by organizationId before passing.
 * @param options.idGen     Optional factory for generating new contact ids.
 *                          Defaults to `uuidv7`. Pass a sequential counter in
 *                          tests: `let i = 0; () => \`test-\${++i}\``.
 */
export function resolveContactsForImport(
  inputs: readonly ContactResolutionInput[],
  existingContacts: readonly ExistingContact[],
  options?: { idGen?: () => string },
): ContactResolutionResult {
  const idGen = options?.idGen ?? uuidv7;

  // Build lookup maps for existing contacts keyed by normalised email / name.
  // Email lookup takes precedence; name lookup is a secondary fallback.
  const existingByEmail = new Map<string, ExistingContact>();
  const existingByName = new Map<string, ExistingContact>();

  for (const c of existingContacts) {
    const emailKey = normaliseEmailKey(c.email);
    if (emailKey !== null && !existingByEmail.has(emailKey)) {
      existingByEmail.set(emailKey, c);
    }
    const nameKey = normaliseNameKey(c.name);
    if (nameKey !== null && !existingByName.has(nameKey)) {
      existingByName.set(nameKey, c);
    }
  }

  // Intra-batch dedup maps: key → freshly-generated id (for toCreate candidates)
  const batchEmailToId = new Map<string, string>();
  const batchNameToId = new Map<string, string>();

  // toCreate: collect by id to preserve insertion order + dedup
  const toCreateMap = new Map<
    string,
    { id: string; name: string; email: string | null }
  >();

  const resolutions: ResolvedContact[] = [];
  // Tracks DISTINCT pre-existing contact ids matched in this batch.
  // Using a Set ensures that multiple rows pointing to the same existing contact
  // only count once in linkedCount (distinct-contact semantics).
  const linkedExistingContactIds = new Set<string>();
  let nullCount = 0;

  for (const input of inputs) {
    const emailKey = normaliseEmailKey(input.email);
    const nameKey = normaliseNameKey(input.name);

    // ---- Path A: input has an email ----------------------------------------
    if (emailKey !== null) {
      // 1. Match against existing contacts by email
      const existingMatch = existingByEmail.get(emailKey);
      if (existingMatch !== undefined) {
        resolutions.push({ contactId: existingMatch.id, isNew: false });
        linkedExistingContactIds.add(existingMatch.id);
        continue;
      }

      // 2. No existing match — create (or reuse intra-batch dedup)
      const existingBatchId = batchEmailToId.get(emailKey);
      if (existingBatchId !== undefined) {
        // Second+ occurrence of same email in this batch → reuse id
        resolutions.push({ contactId: existingBatchId, isNew: true });
        continue;
      }

      // First occurrence: mint a new id, record in toCreate
      const newId = idGen();
      batchEmailToId.set(emailKey, newId);
      // name is required in toCreate (salesContacts.name is NOT NULL);
      // use the input name if present, else fall back to the email itself
      // (pragmatic: an email-only row still needs a non-null name).
      const contactName = input.name?.trim() ?? input.email ?? emailKey;
      toCreateMap.set(newId, {
        id: newId,
        name: contactName,
        email: input.email?.trim() ?? null,
      });
      resolutions.push({ contactId: newId, isNew: true });
      continue;
    }

    // ---- Path B: input has a name but no email ------------------------------
    if (nameKey !== null) {
      // 1. Match against existing contacts by name
      const existingMatch = existingByName.get(nameKey);
      if (existingMatch !== undefined) {
        resolutions.push({ contactId: existingMatch.id, isNew: false });
        linkedExistingContactIds.add(existingMatch.id);
        continue;
      }

      // 2. No existing match — create (or reuse intra-batch dedup)
      const existingBatchId = batchNameToId.get(nameKey);
      if (existingBatchId !== undefined) {
        resolutions.push({ contactId: existingBatchId, isNew: true });
        continue;
      }

      // First occurrence: mint a new id
      const newId = idGen();
      batchNameToId.set(nameKey, newId);
      toCreateMap.set(newId, {
        id: newId,
        name: input.name?.trim() ?? nameKey,
        email: null,
      });
      resolutions.push({ contactId: newId, isNew: true });
      continue;
    }

    // ---- Path C: neither name nor email ------------------------------------
    resolutions.push({ contactId: null, isNew: false });
    nullCount++;
  }

  const toCreate = Array.from(toCreateMap.values());

  return {
    resolutions,
    toCreate,
    counters: {
      linkedCount: linkedExistingContactIds.size,
      createdCount: toCreate.length,
      nullCount,
    },
  };
}
