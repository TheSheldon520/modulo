// apps/web/lib/owner-avatar.ts
//
// Pure helper for generating owner avatar initials in the Sales Kanban card.
// No React, no I/O — fully testable in a bare Vitest node environment.
//
// Kept in `apps/web/lib/` because it is specific to the sales-analytics UI
// layer and does not belong in `packages/ui` (which should remain generic).

/**
 * Returns 1–2 initials derived from a display name.
 *
 * Rules (in order):
 *   1. Trim whitespace from the full name.
 *   2. Split on whitespace (one or more spaces).
 *   3. Take the first character of the first word and the first character of
 *      the last word (if there are at least 2 words). Both are uppercased.
 *   4. If the name is empty or null → return "?".
 *
 * Examples:
 *   "Chris Kapro"         → "CK"
 *   "Sophie Martin"       → "SM"
 *   "Chris"               → "C"
 *   ""                    → "?"
 *   null                  → "?"
 *   "  jean-pierre bourbon  " → "JB"
 *   "Alice Van Der Berg"  → "AB" (first + last word initials)
 */
export function getOwnerInitials(name: string | null | undefined): string {
  if (!name) return "?";

  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  if (parts.length === 1) return first || "?";

  const last = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
  return `${first}${last}` || "?";
}
