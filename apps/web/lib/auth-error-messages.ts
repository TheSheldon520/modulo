// apps/web/lib/auth-error-messages.ts
//
// Pure mapping from Better Auth error codes to localized user-facing messages.
// No React, no next-intl runtime — fully testable in a bare Vitest environment.
//
// Pattern (Piste 3 — confirmed in T outillage i18n): the call-site resolves
// each i18n key via `t(...)` (so next-intl's literal-key narrowing fires
// statically), bundles the strings into a typed `AuthErrorMessages` object,
// and hands it to this mapper alongside the BA error.
//
// SECURITY NOTE — credential enumeration (DEFENSIVE mapping):
//   `CREDENTIAL_ACCOUNT_NOT_FOUND` is NOT emitted by `signIn.email` in BA
//   1.4.22 — that flow collapses all "wrong account" cases into the single
//   `INVALID_EMAIL_OR_PASSWORD` code (verified by reading
//   `node_modules/.../sign-in.mjs`). The code IS however emitted by other BA
//   endpoints (e.g. `update-user.mjs`) and could resurface in future BA
//   versions or in flows we add later (password reset, account linking, …).
//
//   We map it pre-emptively onto the same message as
//   `INVALID_EMAIL_OR_PASSWORD` so that, IF it ever lands at a login UI, the
//   failure mode stays indistinguishable from the outside — no attacker can
//   probe whether an email is registered. The lock-in test below catches any
//   accidental divergence.
//
// Source of BA error codes:
//   node_modules/@better-auth/core/dist/error/codes.mjs
//   (BASE_ERROR_CODES enum — version 1.4.22 at the time of writing).

/**
 * Structural shape of a Better Auth client error. We narrow `code` to the
 * subset of BASE_ERROR_CODES we explicitly map. Unknown codes pass through
 * to the generic fallback.
 */
export interface AuthErrorLike {
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * Localized messages bag handed to the mapper. The call-site resolves each
 * value via `t(...)` at render time. Field names mirror the semantic codes
 * (not the raw BA enum) so the API stays stable if BA adds/renames codes.
 */
export interface AuthErrorMessages {
  /** INVALID_EMAIL_OR_PASSWORD + CREDENTIAL_ACCOUNT_NOT_FOUND (anti-enum). */
  invalidCreds: string;
  /** INVALID_EMAIL. */
  invalidEmail: string;
  /** USER_ALREADY_EXISTS + USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL. */
  emailTaken: string;
  /** PASSWORD_TOO_SHORT. */
  passwordTooShort: string;
  /** PASSWORD_TOO_LONG. */
  passwordTooLong: string;
  /** FAILED_TO_CREATE_USER. */
  failedToCreate: string;
  /** PROVIDER_NOT_FOUND (OAuth). */
  providerError: string;
  /** Catch-all fallback for any code not listed above (or no code at all). */
  generic: string;
}

/**
 * Maps a Better Auth client error to a localized message. Returns the generic
 * fallback for unknown codes / missing code so the user never sees a raw EN
 * BA message.
 *
 * Always pass `error.code` — never fall back to `error.message`, which is the
 * upstream EN string and would defeat the localization.
 *
 * Known BA codes intentionally LEFT to fall through to `generic` (for now):
 *   - `EMAIL_NOT_VERIFIED` — only emitted when `requireEmailVerification` is
 *     enabled in BA config; not the case at Modulo today. Add a dedicated
 *     message when verify-email ships.
 *   - `FAILED_TO_CREATE_SESSION` — rare race condition (DB write fails after
 *     successful auth). The generic "réessayez" copy is appropriate.
 *   - `INVALID_PASSWORD` — emitted by `signUp.email` when `password` is not a
 *     string. Unreachable from our `<input type="password">` form (always
 *     returns a string); guarded here so an injected non-string payload still
 *     maps to a sane message.
 * If any of these become user-visible at non-trivial rates, add a switch case
 * with a dedicated i18n key under `auth.errors.ba.*`.
 */
export function mapAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  messages: AuthErrorMessages,
): string {
  if (!error) return messages.generic;

  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      // SECURITY: same message for both — see file-level header note.
      return messages.invalidCreds;

    case "INVALID_EMAIL":
      return messages.invalidEmail;

    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return messages.emailTaken;

    case "PASSWORD_TOO_SHORT":
      return messages.passwordTooShort;

    case "PASSWORD_TOO_LONG":
      return messages.passwordTooLong;

    case "FAILED_TO_CREATE_USER":
      return messages.failedToCreate;

    case "PROVIDER_NOT_FOUND":
      return messages.providerError;

    default:
      // Unknown / undefined code → never expose the raw upstream EN message.
      return messages.generic;
  }
}
