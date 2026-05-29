// apps/web/lib/deal-update-form-schema.ts
//
// Zod schema factory for the "Edit Deal" side panel form. Mirrors the pattern
// of `deal-form-schema.ts` (new deal dialog): the factory takes the next-intl
// `t()` so validation messages stay localized, while the schema itself remains
// testable in isolation with an identity-stub translator.
//
// This schema is *distinct* from `dealUpdateSchema` exported by the backend
// router (which carries English-only messages and has no i18n dependency). The
// UI layer wraps the same constraints and adds i18n messages.
//
// `amount` accepts a string already in `^\d+(\.\d{1,2})?$` form — the calling
// component converts the HTML <input type="number"> value to a string before
// passing it here. `stage` comes from the STAGES source of truth. `contactId`
// is nullable (empty string → null at the wire boundary).

import { z } from "zod";

// Import from the pure schemas module — NOT the router barrel — so this
// factory stays consumable by both Client Components and tests without
// pulling @trpc/server into the browser bundle.
import { DEAL_STAGES } from "@modulo/sales-analytics/schemas";

import type { TranslateFn } from "./auth-schemas";

export function makeDealUpdateFormSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("sidePanel.errors.nameRequired"))
      .max(200, t("sidePanel.errors.nameTooLong")),
    amount: z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        t("sidePanel.errors.amountInvalid"),
      ),
    stage: z.enum(DEAL_STAGES),
    // contactId: empty string = no contact selected (maps to null at wire).
    // UUID string = contact selected. The component normalises the value before
    // mutating: "" → null, non-empty → the UUID string.
    contactId: z.string(),
  });
}

export type DealUpdateFormInput = z.infer<
  ReturnType<typeof makeDealUpdateFormSchema>
>;
