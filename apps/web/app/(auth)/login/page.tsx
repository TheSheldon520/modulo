"use client";

// apps/web/app/(auth)/login/page.tsx
//
// Sign-in page. Client component because the form holds local state (fields,
// loading, error) and calls the Better Auth client directly. Validation is
// done with Zod (single source of truth for form schemas — CLAUDE.md §TS),
// and the schema lives inside the component so error messages can use `t()`
// from next-intl.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";
import { Card } from "@modulo/ui/components/card";
import { Input } from "@modulo/ui/components/input";

import { makeLoginSchema } from "@/lib/auth-schemas";
import { GithubLogo, GoogleLogo } from "../brand-logos";

export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Factory consumes the next-intl `t()` so Zod error messages stay localized.
  const loginSchema = makeLoginSchema(t);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.signInFailed"));
      return;
    }

    setLoading(true);
    const { error: authError } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });
    setLoading(false);

    if (authError) {
      // Better Auth error messages are still upstream English (mapping to
      // localized strings is tracked for T1.X).
      setError(authError.message ?? t("errors.signInFailed"));
      return;
    }

    router.push("/dashboard");
  }

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setLoading(true);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: "/dashboard",
    });
    if (authError) {
      setLoading(false);
      setError(authError.message ?? t("errors.oauthFailed"));
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

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("submitLoading") : t("submit")}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-sm text-text-tertiary">
          {t("noAccount")}{" "}
          <Link href="/signup" className="text-accent">
            {t("createOne")}
          </Link>
        </p>
      </div>
    </main>
  );
}
