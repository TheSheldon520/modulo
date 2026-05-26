// apps/web/lib/slugify.ts
//
// Helper used by the onboarding form to auto-populate the slug input as the
// user types the organization name. Pure / deterministic, no I/O — kept
// dependency-free so it can be unit-tested in isolation.
//
// Pipeline:
//   1. NFD-normalize and strip combining marks → "Café" → "Cafe"
//   2. Lowercase
//   3. Collapse any run of non-alphanumeric characters to a single dash
//   4. Trim leading / trailing dashes
//
// The output is always a valid value for the `[a-z0-9-]+` slug constraint
// (possibly empty if the input had no alphanumerics at all — the form is
// responsible for handling the empty case via its own min-length validation).

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Strip combining diacritical marks (U+0300–U+036F).
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
