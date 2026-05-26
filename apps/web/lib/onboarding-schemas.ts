// apps/web/lib/onboarding-schemas.ts
//
// Zod schema factory for the "create your organization" onboarding form.
// Mirrors the pattern of `auth-schemas.ts`: a factory takes the next-intl
// `t()` so error messages stay localized, while the schema itself remains
// testable in isolation with an identity-stub translator.
//
// Server-side validation lives in `packages/api/src/routers/organizations.ts`
// and is intentionally re-declared there (locale-agnostic English messages)
// — the server can't depend on next-intl, and we don't want the server to
// re-import the client schema either.

import { z } from "zod";

import type { TranslateFn } from "./auth-schemas";

export function makeCreateOrgSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("errors.nameRequired"))
      .max(100, t("errors.nameTooLong")),
    slug: z
      .string()
      .trim()
      .min(3, t("errors.slugTooShort"))
      .max(50, t("errors.slugTooLong"))
      .regex(/^[a-z0-9-]+$/, t("errors.slugFormat")),
  });
}

export type CreateOrgInput = z.infer<ReturnType<typeof makeCreateOrgSchema>>;
