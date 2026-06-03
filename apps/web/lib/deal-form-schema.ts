// apps/web/lib/deal-form-schema.ts
//
// Zod schema factory for the "New Deal" form. Mirrors the pattern of
// `onboarding-schemas.ts` + `auth-schemas.ts`: the factory takes a resolved
// messages object so validation messages stay localized at the call-site (via
// next-intl `t()`), while the schema itself remains testable in isolation
// with a plain stub object.
//
// This schema is *distinct* from `dealCreateSchema` exported by the backend
// router (which carries English-only messages and has no i18n dependency). The
// UI layer wraps the same constraints and adds i18n messages.
//
// One important difference: the `amount` field here accepts a `string` that is
// already in `^\d+(\.\d{1,2})?$` form — the calling component converts the
// HTML <input type="number"> value to a string before passing it here.

import { z } from "zod";

// Import from the pure schemas module — NOT the router barrel — so this
// factory stays consumable by both Client Components and tests without
// pulling @trpc/server into the browser bundle.
import { DEAL_STAGES } from "@modulo/sales-analytics/schemas";

/** Resolved error messages consumed by `makeDealCreateFormSchema`. */
export interface DealCreateFormSchemaMessages {
  nameRequired: string;
  nameTooLong: string;
  amountInvalid: string;
}

export function makeDealCreateFormSchema(
  messages: DealCreateFormSchemaMessages,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(200, messages.nameTooLong),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, messages.amountInvalid),
    stage: z.enum(DEAL_STAGES),
  });
}

export type DealCreateFormInput = z.infer<
  ReturnType<typeof makeDealCreateFormSchema>
>;
