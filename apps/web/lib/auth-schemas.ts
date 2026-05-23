// apps/web/lib/auth-schemas.ts
//
// Zod schema factories for the auth forms. The schemas are factories (not
// static `z.object` constants) so error messages can be supplied by the
// next-intl `t()` function passed by the caller — yet they remain testable in
// isolation with an identity-stub `t`.
//
// Single source of truth for client-side validation. Server-side validation
// will be re-added inside tRPC procedures in T1.X when we own the BA sign-up
// flow ourselves.

import { z } from "zod";

/** Shape of the next-intl translator passed to the factories. */
export type TranslateFn = (key: string) => string;

export function makeLoginSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t("errors.invalidEmail")),
    password: z.string().min(1, t("errors.passwordRequired")),
  });
}
export type LoginInput = z.infer<ReturnType<typeof makeLoginSchema>>;

export function makeSignupSchema(t: TranslateFn) {
  return z.object({
    name: z.string().min(1, t("errors.nameRequired")),
    email: z.string().email(t("errors.invalidEmail")),
    password: z.string().min(8, t("errors.passwordTooShort")),
  });
}
export type SignupInput = z.infer<ReturnType<typeof makeSignupSchema>>;
