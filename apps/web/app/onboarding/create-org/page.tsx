"use client";

// apps/web/app/onboarding/create-org/page.tsx
//
// Onboarding step that gates `/dashboard` for users who have signed up but
// don't belong to any organization yet. Client Component because the form
// holds local state (fields, dirty-slug flag, loading, error) and calls a
// tRPC mutation directly.
//
// Layout deliberately mirrors `/login` and `/signup` (centered, sober, single
// Card) — the user shouldn't feel they've teleported into a different app.
//
// Auto-slugify behaviour:
//   - As long as the user hasn't manually edited the slug, it's kept in sync
//     with `slugify(name)`. The moment the user types in the slug field,
//     `userEditedSlug` flips to true and the auto-sync stops for the rest of
//     the session. This matches the "predictive but never overriding" pattern
//     used by Vercel / GitHub when creating projects.

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { authClient } from "@modulo/auth/client";
import { Button } from "@modulo/ui/components/button";
import { Card } from "@modulo/ui/components/card";
import { SubmitButton } from "@modulo/ui/components/submit-button";
import { Input } from "@modulo/ui/components/input";

import { makeCreateOrgSchema } from "@/lib/onboarding-schemas";
import { slugify } from "@/lib/slugify";
import { trpc } from "@/lib/trpc/client";

export default function CreateOrgPage() {
  const t = useTranslations("onboarding.createOrg");
  const router = useRouter();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [userEditedSlug, setUserEditedSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrgSchema = makeCreateOrgSchema(t);

  const createOrg = trpc.organizations.create.useMutation();
  const loading = createOrg.isPending;

  // Auto-sync slug ← name, but never overwrite a slug the user typed manually.
  useEffect(() => {
    if (userEditedSlug) return;
    setSlug(slugify(name));
  }, [name, userEditedSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = createOrgSchema.safeParse({ name, slug });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("errors.generic"));
      return;
    }

    try {
      const result = await createOrg.mutateAsync({
        name: parsed.data.name,
        slug: parsed.data.slug,
      });
      // Force `whoami` (and any other authed query) to refetch so the next
      // server-rendered page sees the new active org.
      await utils.invalidate();
      // The mutation returns the canonical slug — use it directly rather than
      // `parsed.data.slug` (defensive: the server is the source of truth for
      // the slug, in case any normalization happened along the way).
      router.push(`/${result.slug}/dashboard`);
    } catch (err) {
      // tRPC client errors expose `data.code` on the structured payload.
      const code =
        typeof err === "object" &&
        err !== null &&
        "data" in err &&
        typeof (err as { data: unknown }).data === "object" &&
        (err as { data: { code?: unknown } }).data !== null
          ? (err as { data: { code?: unknown } }).data.code
          : undefined;
      if (code === "CONFLICT") {
        setError(t("errors.slugTaken"));
      } else {
        setError(t("errors.generic"));
      }
    }
  }

  async function handleLogout() {
    try {
      await authClient.signOut();
      router.push("/login");
    } catch {
      // Best-effort fallback: navigate to /login even if signOut threw. The
      // router.push below is what drives the redirect — the middleware is a
      // route gate, not the logout orchestrator. If BA failed to clear its
      // session cookie, the middleware will simply bounce the user back to
      // /dashboard on the next navigation; the UI stays responsive either way.
      router.push("/login");
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
          <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm text-text-secondary">
                {t("nameLabel")}
              </label>
              <Input
                id="name"
                type="text"
                autoComplete="organization"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="slug" className="text-sm text-text-secondary">
                {t("slugLabel")}
              </label>
              <Input
                id="slug"
                type="text"
                autoComplete="off"
                placeholder={t("slugPlaceholder")}
                className="font-mono"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setUserEditedSlug(true);
                  if (error) setError(null);
                }}
                disabled={loading}
              />
              <p className="text-xs text-text-tertiary">{t("slugHint")}</p>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <SubmitButton
              type="submit"
              className="w-full"
              isLoading={createOrg.isPending}
              loadingLabel={t("submittingButton")}
            >
              {t("submitButton")}
            </SubmitButton>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void handleLogout()}
              disabled={loading}
            >
              {t("logoutButton")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
