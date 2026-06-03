// apps/web/lib/auth-schemas.ts
//
// Zod schema factories for the auth forms. The schemas are factories (not
// static `z.object` constants) so error messages can be supplied by the
// next-intl `t()` function at the call-site — yet they remain testable in
// isolation with a plain object of stub strings.
//
// Single source of truth for client-side validation. Server-side validation
// will be re-added inside tRPC procedures in T1.X when we own the BA sign-up
// flow ourselves.
//
// Resolution pattern (Piste 3) — chosen to keep the factory call-site
// strictly type-safe with next-intl:
//   const t = useTranslations("auth.login");
//   const schema = makeLoginSchema({
//     invalidEmail: t("errors.invalidEmail"),
//     passwordRequired: t("errors.passwordRequired"),
//   });
// `t(...)` is resolved BEFORE the factory call, so next-intl's literal-key
// type-check fires at the call-site, and the factory consumes already-resolved
// strings. This removes the need for a loose `TranslateFn` alias that bypasses
// next-intl's narrowing.

import { z } from "zod";

/** Resolved error messages consumed by `makeLoginSchema`. */
export interface LoginSchemaMessages {
  invalidEmail: string;
  passwordRequired: string;
}

export function makeLoginSchema(messages: LoginSchemaMessages) {
  return z.object({
    email: z.string().email(messages.invalidEmail),
    password: z.string().min(1, messages.passwordRequired),
  });
}
export type LoginInput = z.infer<ReturnType<typeof makeLoginSchema>>;

/** Resolved error messages consumed by `makeSignupSchema`. */
export interface SignupSchemaMessages {
  nameRequired: string;
  invalidEmail: string;
  passwordTooShort: string;
}

export function makeSignupSchema(messages: SignupSchemaMessages) {
  return z.object({
    name: z.string().min(1, messages.nameRequired),
    email: z.string().email(messages.invalidEmail),
    password: z.string().min(8, messages.passwordTooShort),
  });
}
export type SignupInput = z.infer<ReturnType<typeof makeSignupSchema>>;
