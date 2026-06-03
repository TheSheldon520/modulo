// apps/web/lib/onboarding-schemas.ts
//
// Zod schema factory for the "create your organization" onboarding form.
// Mirrors the pattern of `auth-schemas.ts`: the factory takes a resolved
// messages object so error messages stay localized at the call-site (via
// next-intl `t()`), while the schema itself remains testable in isolation
// with a plain stub object.
//
// Server-side validation lives in `packages/api/src/routers/organizations.ts`
// and is intentionally re-declared there (locale-agnostic English messages)
// — the server can't depend on next-intl, and we don't want the server to
// re-import the client schema either.

import { z } from "zod";

/** Resolved error messages consumed by `makeCreateOrgSchema`. */
export interface CreateOrgSchemaMessages {
  nameRequired: string;
  nameTooLong: string;
  slugTooShort: string;
  slugTooLong: string;
  slugFormat: string;
}

export function makeCreateOrgSchema(messages: CreateOrgSchemaMessages) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(100, messages.nameTooLong),
    slug: z
      .string()
      .trim()
      .min(3, messages.slugTooShort)
      .max(50, messages.slugTooLong)
      .regex(/^[a-z0-9-]+$/, messages.slugFormat),
  });
}

export type CreateOrgInput = z.infer<ReturnType<typeof makeCreateOrgSchema>>;
