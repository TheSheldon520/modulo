"use client";

// apps/web/app/(auth)/signup/page.tsx
//
// Sign-up page. Client component for the same reasons as /login. Zod is the
// single source of truth for validation; `name` is enforced client-side
// because `users.name` is nullable in DB (OAuth providers may not return a
// name) but every interactive signup must provide one. The schema lives
// inside the component so error messages stay localized via next-intl.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";
import { Card } from "@modulo/ui/components/card";
import { Input } from "@modulo/ui/components/input";
import { SubmitButton } from "@modulo/ui/components/submit-button";

import { makeSignupSchema } from "@/lib/auth-schemas";
import {
  mapAuthErrorMessage,
  type AuthErrorMessages,
} from "@/lib/auth-error-messages";
import { GithubLogo, GoogleLogo } from "../brand-logos";

export default function SignupPage() {
  const t = useTranslations("auth.signup");
  const tBaErrors = useTranslations("auth.errors.ba");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resolve i18n keys at the call-site (Piste 3) so next-intl's literal-key
  // narrowing fires here, then hand a plain messages object to the factory.
  const signupSchema = makeSignupSchema({
    nameRequired: t("errors.nameRequired"),
    invalidEmail: t("errors.invalidEmail"),
    passwordTooShort: t("errors.passwordTooShort"),
  });

  // Localized BA error messages bag, resolved once per render so the mapper
  // stays a pure (non-i18n-dependent) function. Mirrors the factory pattern
  // used by makeSignupSchema above.
  const baErrorMessages: AuthErrorMessages = {
    invalidCreds: tBaErrors("invalidCreds"),
    invalidEmail: tBaErrors("invalidEmail"),
    emailTaken: tBaErrors("emailTaken"),
    passwordTooShort: tBaErrors("passwordTooShort"),
    passwordTooLong: tBaErrors("passwordTooLong"),
    failedToCreate: tBaErrors("failedToCreate"),
    providerError: tBaErrors("providerError"),
    generic: tBaErrors("generic"),
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.signUpFailed"));
      return;
    }

    setLoading(true);
    // Note on `callbackURL`: unlike `signIn.email`, BA's `signUp.email`
    // (sign-up.mjs:215 — returns `ctx.json({token, user})`) does NOT set
    // `data.redirect`/`data.url` on the response, so the client-side
    // `redirectPlugin` never fires after sign-up. We must navigate manually
    // below. The `callbackURL` kept here only feeds the verify-email URL
    // (sign-up.mjs:197) for the day email verification is enabled.
    const { error: authError } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/onboarding/create-org",
    });

    if (authError) {
      setLoading(false);
      // Map BA error code → localized FR/EN message. Never surface
      // authError.message (upstream EN). Unknown codes → generic fallback.
      setError(mapAuthErrorMessage(authError, baErrorMessages));
      return;
    }

    // BA created the user + session (autoSignIn:true) but didn't navigate.
    // Push to `/` — the same canonical resolver login uses. With zero
    // memberships for a brand-new user, the resolver bounces to
    // `/onboarding/create-org` via its DB fallback (apps/web/app/page.tsx).
    // We never hardcode `/onboarding/create-org` here so a future flow
    // change (e.g. invite-then-signup) doesn't need to touch this file.
    //
    // `loading` stays true through `router.push` so the SubmitButton remains
    // disabled — same anti-double-submit invariant as login. Cleared by the
    // unmount when the resolver redirects.
    router.push("/");
  }

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setLoading(true);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });
    if (authError) {
      setLoading(false);
      setError(mapAuthErrorMessage(authError, baErrorMessages));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-0 px-6">
      <div className="flex w-full max-w-md flex-col items-center">
        <h1 className="text-3xl font-medium tracking-tight text-text-primary">
          Modulo
        </h1>
        <div className="my-6 h-px w-10 bg-border-subtle" />

        <Card className="w-full p-8">
          <h2 className="text-xl text-text-primary">{t("title")}</h2>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuth("github")}
              disabled={loading}
            >
              <GithubLogo className="size-4" />
              {t("continueWithGithub")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleOAuth("google")}
              disabled={loading}
            >
              <GoogleLogo className="size-4" />
              {t("continueWithGoogle")}
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 border-t border-border-subtle" />
            <span className="text-2xs uppercase tracking-wide text-text-tertiary">
              {t("orWithEmail")}
            </span>
            <div className="h-px flex-1 border-t border-border-subtle" />
          </div>

          {/* noValidate : disable the browser's native validation popups
              ("Veuillez renseigner ce champ") so our branded FR Zod messages
              own the empty-field UX consistently across browsers. */}
          <form
            onSubmit={(e) => void handleSubmit(e)}
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm text-text-secondary">
                {t("nameLabel")}
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm text-text-secondary">
                {t("emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm text-text-secondary">
                {t("passwordLabel")}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            {/* Convention Modulo CLAUDE.md §5 — tout submit lié à une
                mutation (ici Better Auth signUp) passe par SubmitButton.
                isLoading branché sur le state `loading` existant : disable
                + spinner + swap du label vers `submitLoading`. */}
            <SubmitButton
              type="submit"
              className="w-full"
              isLoading={loading}
              loadingLabel={t("submitLoading")}
            >
              {t("submit")}
            </SubmitButton>
          </form>
        </Card>

        <p className="mt-6 text-sm text-text-tertiary">
          {t("haveAccount")}{" "}
          <Link href="/login" className="text-accent">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
