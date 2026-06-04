// apps/web/lib/auth-error-messages.test.ts
//
// Unit tests for the BA-code → localized-message mapper. Stub values match
// the i18n key name so assertions stay locale-agnostic — same pattern as the
// auth-schemas / onboarding-schemas test stubs.

import { describe, expect, it } from "vitest";

import {
  mapAuthErrorMessage,
  type AuthErrorMessages,
} from "./auth-error-messages";

const messages: AuthErrorMessages = {
  invalidCreds: "errors.ba.invalidCreds",
  invalidEmail: "errors.ba.invalidEmail",
  emailTaken: "errors.ba.emailTaken",
  passwordTooShort: "errors.ba.passwordTooShort",
  passwordTooLong: "errors.ba.passwordTooLong",
  failedToCreate: "errors.ba.failedToCreate",
  providerError: "errors.ba.providerError",
  generic: "errors.ba.generic",
};

describe("mapAuthErrorMessage — known codes", () => {
  it("maps INVALID_EMAIL_OR_PASSWORD to invalidCreds", () => {
    expect(
      mapAuthErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" }, messages),
    ).toBe(messages.invalidCreds);
  });

  it("maps CREDENTIAL_ACCOUNT_NOT_FOUND to invalidCreds (anti-enumeration)", () => {
    // Security invariant: same message as INVALID_EMAIL_OR_PASSWORD so an
    // attacker can't distinguish "wrong password" from "no such account".
    expect(
      mapAuthErrorMessage({ code: "CREDENTIAL_ACCOUNT_NOT_FOUND" }, messages),
    ).toBe(messages.invalidCreds);
  });

  it("guarantees INVALID_EMAIL_OR_PASSWORD and CREDENTIAL_ACCOUNT_NOT_FOUND collapse to the same string", () => {
    // Lock-in test against a future refactor that would accidentally diverge
    // these two paths — credential enumeration would re-open silently.
    const a = mapAuthErrorMessage(
      { code: "INVALID_EMAIL_OR_PASSWORD" },
      messages,
    );
    const b = mapAuthErrorMessage(
      { code: "CREDENTIAL_ACCOUNT_NOT_FOUND" },
      messages,
    );
    expect(a).toBe(b);
  });

  it("maps INVALID_EMAIL to invalidEmail", () => {
    expect(mapAuthErrorMessage({ code: "INVALID_EMAIL" }, messages)).toBe(
      messages.invalidEmail,
    );
  });

  it("maps USER_ALREADY_EXISTS to emailTaken", () => {
    expect(
      mapAuthErrorMessage({ code: "USER_ALREADY_EXISTS" }, messages),
    ).toBe(messages.emailTaken);
  });

  it("maps USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL to emailTaken", () => {
    expect(
      mapAuthErrorMessage(
        { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
        messages,
      ),
    ).toBe(messages.emailTaken);
  });

  it("maps PASSWORD_TOO_SHORT to passwordTooShort", () => {
    expect(
      mapAuthErrorMessage({ code: "PASSWORD_TOO_SHORT" }, messages),
    ).toBe(messages.passwordTooShort);
  });

  it("maps PASSWORD_TOO_LONG to passwordTooLong", () => {
    expect(mapAuthErrorMessage({ code: "PASSWORD_TOO_LONG" }, messages)).toBe(
      messages.passwordTooLong,
    );
  });

  it("maps FAILED_TO_CREATE_USER to failedToCreate", () => {
    expect(
      mapAuthErrorMessage({ code: "FAILED_TO_CREATE_USER" }, messages),
    ).toBe(messages.failedToCreate);
  });

  it("maps PROVIDER_NOT_FOUND to providerError", () => {
    expect(
      mapAuthErrorMessage({ code: "PROVIDER_NOT_FOUND" }, messages),
    ).toBe(messages.providerError);
  });
});

describe("mapAuthErrorMessage — unknown / missing input", () => {
  it("returns generic for an unknown code", () => {
    expect(
      mapAuthErrorMessage({ code: "SOME_FUTURE_CODE_WE_DONT_HANDLE" }, messages),
    ).toBe(messages.generic);
  });

  it("returns generic when code is undefined", () => {
    expect(mapAuthErrorMessage({ code: undefined }, messages)).toBe(
      messages.generic,
    );
  });

  it("returns generic when error has only a message (no code)", () => {
    expect(
      mapAuthErrorMessage({ message: "Some upstream EN message" }, messages),
    ).toBe(messages.generic);
  });

  it("returns generic when error is null", () => {
    expect(mapAuthErrorMessage(null, messages)).toBe(messages.generic);
  });

  it("returns generic when error is undefined", () => {
    expect(mapAuthErrorMessage(undefined, messages)).toBe(messages.generic);
  });

  it("never returns the upstream message, even if present", () => {
    // Lock-in: a future "fall back to error.message if no code matched"
    // refactor would re-introduce upstream EN strings. This test catches it.
    const result = mapAuthErrorMessage(
      {
        code: "UNKNOWN_TO_US",
        message: "Some plausibly-localized EN string",
      },
      messages,
    );
    expect(result).toBe(messages.generic);
    expect(result).not.toBe("Some plausibly-localized EN string");
  });
});
