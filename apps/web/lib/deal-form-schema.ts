// apps/web/lib/deal-form-schema.ts
//
// Zod schema factory for the "New Deal" form. Mirrors the pattern of
// `onboarding-schemas.ts` + `auth-schemas.ts`: the factory takes the
// next-intl `t()` so validation messages stay localized, while the schema
// itself remains testable in isolation with an identity-stub translator.
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

import type { TranslateFn } from "./auth-schemas";

export function makeDealCreateFormSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("dialogs.newDeal.errors.nameRequired"))
      .max(200, t("dialogs.newDeal.errors.nameTooLong")),
    amount: z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        t("dialogs.newDeal.errors.amountInvalid"),
      ),
    stage: z.enum(DEAL_STAGES),
  });
}

export type DealCreateFormInput = z.infer<
  ReturnType<typeof makeDealCreateFormSchema>
>;
