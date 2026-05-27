"use client";

// apps/web/app/(app)/settings/billing/page.tsx
//
// Billing settings — surfaces every registered module with its activation
// status and lets the user open a Stripe Checkout for inactive ones, or the
// Stripe Customer Portal to manage existing subscriptions.
//
// Client Component because:
//   - tRPC `useQuery` + `useMutation` (live state)
//   - `useRouter.replace` to scrub query params after toasting (avoid re-toast
//     on hard refresh)
//
// `useSearchParams()` is isolated in <BillingToastWatcher> and wrapped in
// <Suspense fallback={null}> to satisfy the Next 15 prerender requirement:
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Card } from "@modulo/ui/components/card";
import { SubmitButton } from "@modulo/ui/components/submit-button";

import { trpc } from "@/lib/trpc/client";

type ActivationStatus =
  | "active"
  | "trial"
  | "past_due"
  | "canceled"
  | "inactive"
  | "coming_soon";

/**
 * tRPC error data may carry a `code` string. Narrow `unknown` to extract it
 * without an `any` cast — same pattern used in `/onboarding/create-org`.
 */
function extractTRPCCode(err: unknown): string | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data: unknown }).data === "object" &&
    (err as { data: unknown }).data !== null
  ) {
    const code = (err as { data: { code?: unknown } }).data.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Isolated consumer of `useSearchParams()`. Must live in its own component
 * so the parent can wrap it in <Suspense> — Next 15 requires any component
 * calling useSearchParams() to be inside a Suspense boundary during prerender.
 * The fallback is intentionally null: toasts have no visual loading state.
 */
function BillingToastWatcher() {
  const t = useTranslations("settings.billing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();

  // Surface Stripe redirect outcomes via toast, then strip the query params
  // so a hard refresh doesn't re-toast.
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success(t("successToast"));
      void utils.billing.listAvailableModules.invalidate();
      router.replace("/settings/billing");
    } else if (searchParams.get("canceled") === "true") {
      toast(t("canceledToast"));
      router.replace("/settings/billing");
    }
    // Run on mount + when params change. `t` and `router`/`utils` are stable
    // references in practice (next-intl/next memoise them), but listing them
    // explicitly silences exhaustive-deps without breaking semantics.
  }, [searchParams, t, router, utils]);

  return null;
}

export default function BillingPage() {
  const t = useTranslations("settings.billing");

  const modulesQuery = trpc.billing.listAvailableModules.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();
  const createPortal = trpc.billing.createPortalSession.useMutation();

  // Track the slug currently being checked out so only its button shows
  // "Activating…" — otherwise every Activate button would flip at once.
  const pendingSlugRef = useRef<string | null>(null);

  async function handleActivate(slug: string) {
    pendingSlugRef.current = slug;
    try {
      const { checkoutUrl } = await createCheckout.mutateAsync({
        moduleSlug: slug,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      const code = extractTRPCCode(err);
      if (code === "CONFLICT") {
        toast.error(t("errors.alreadyActive"));
      } else {
        toast.error(t("errors.generic"));
      }
      pendingSlugRef.current = null;
    }
  }

  async function handleOpenPortal() {
    try {
      const { portalUrl } = await createPortal.mutateAsync();
      window.location.href = portalUrl;
    } catch (err) {
      const code = extractTRPCCode(err);
      if (code === "FORBIDDEN") {
        toast.error(t("errors.noSubscription"));
      } else {
        toast.error(t("errors.generic"));
      }
    }
  }

  const modules = modulesQuery.data ?? [];
  const hasAnySubscription = modules.some(
    (m) =>
      m.activationStatus !== "inactive" && m.activationStatus !== "coming_soon",
  );

  return (
    <main className="min-h-screen bg-surface-0 px-6 py-12">
      {/* BillingToastWatcher calls useSearchParams() — must be wrapped in
          Suspense to avoid Next 15 CSR bailout at prerender time. The null
          fallback is intentional: toasts have no visual loading state. */}
      <Suspense fallback={null}>
        <BillingToastWatcher />
      </Suspense>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight text-text-primary">
            {t("title")}
          </h1>
          <p className="text-md text-text-secondary">{t("subtitle")}</p>
        </header>

        <div className="flex flex-col gap-4">
          {modules.map((mod) => {
            const isPending =
              createCheckout.isPending && pendingSlugRef.current === mod.slug;
            return (
              <Card key={mod.slug} className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-md font-medium text-text-primary">
                      {mod.name}
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {mod.description}
                    </p>
                  </div>
                  <StatusBlock
                    status={mod.activationStatus}
                    monthlyPriceLabel={mod.monthlyPriceLabel}
                    isPending={isPending}
                    onActivate={() => void handleActivate(mod.slug)}
                  />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-start">
          <SubmitButton
            type="button"
            variant="outline"
            disabled={!hasAnySubscription}
            isLoading={createPortal.isPending}
            loadingLabel={t("openingPortal")}
            onClick={() => void handleOpenPortal()}
          >
            {t("managePortal")}
          </SubmitButton>
        </div>
      </div>
    </main>
  );
}

interface StatusBlockProps {
  status: ActivationStatus;
  monthlyPriceLabel: string | undefined;
  isPending: boolean;
  onActivate: () => void;
}

/**
 * Right-side block per module: either an Activate button (inactive available
 * modules) or a status badge (everything else). Status badges use the subtle
 * pattern — `bg-{semantic}/10 text-{semantic}` — so they never compete with
 * the primary CTA in visual weight.
 */
function StatusBlock({
  status,
  monthlyPriceLabel,
  isPending,
  onActivate,
}: StatusBlockProps) {
  const t = useTranslations("settings.billing");

  if (status === "inactive") {
    const label = monthlyPriceLabel
      ? t("activate", { price: monthlyPriceLabel })
      : t("activate", { price: "" });
    return (
      <SubmitButton
        onClick={onActivate}
        isLoading={isPending}
        loadingLabel={t("activating")}
      >
        {label}
      </SubmitButton>
    );
  }

  // All non-actionable states render as a subtle badge.
  const variantClass =
    status === "active" || status === "trial"
      ? "bg-success/10 text-success"
      : status === "past_due"
        ? "bg-warning/10 text-warning"
        : "bg-surface-3 text-text-secondary";

  const labelKey: Record<Exclude<ActivationStatus, "inactive">, string> = {
    active: "activated",
    trial: "activated",
    past_due: "pastDue",
    canceled: "canceled",
    coming_soon: "comingSoon",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-2xs font-medium uppercase tracking-wide ${variantClass}`}
    >
      {t(labelKey[status])}
    </span>
  );
}
