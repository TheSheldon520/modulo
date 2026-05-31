"use client";
// "use client" justification: manages view toggle state (useSearchParams +
// useRouter for URL-persisted state), reads filter params from URL, applies
// deal filters client-side, and assembles client-only children
// (<NewDealDialog>, <DealsKanban>, <DealsTable>).
//
// URL persistence rationale: `?view=kanban|table` and `?period=...` are
// shareable and survive hard-refresh, which is preferable to localStorage for
// a collaborative SaaS. Default view is "kanban" when no param is present.
//
// useSearchParams note: Next.js 15 requires this hook to be inside a Suspense
// boundary. The wrapping <Suspense> is in the Server Component page.tsx — see
// the `<Suspense fallback={<DealsViewSkeleton />}>` wrapper there. This
// component is therefore safe to call useSearchParams() directly.
//
// Filter + drag & drop coexistence (Phase 3 + Phase 5):
//   `applyDealFilters` consumes the tRPC cache directly. After an optimistic
//   stage update, the cache is mutated by DealsKanban's `setData` call, which
//   triggers a re-render here — the moved deal is re-evaluated against active
//   filters naturally. No special handling needed.

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterX, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@modulo/ui/components/button";

import { trpc } from "@/lib/trpc/client";
import {
  applyDealFilters,
  hasActiveFilters,
  EMPTY_FILTERS,
  parseFiltersFromUrl,
  serializeFiltersToUrl,
} from "@/lib/sales-deal-filters";

import { NewDealDialog } from "./new-deal-dialog";
import { DealsTable } from "./deals-table";
import { DealsKanban } from "./deals-kanban";
import { ViewToggle, type DealView } from "./view-toggle";
import { DealFilters } from "./deal-filters";

interface DealsViewProps {
  ownerId: string;
  orgSlug: string;
  title: string;
  newDealLabel: string;
}

export function DealsView({ ownerId, orgSlug, title, newDealLabel }: DealsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("modules.salesAnalytics.deals");

  // Read current view from URL — default to "kanban"
  const rawView = searchParams.get("view");
  const view: DealView = rawView === "table" ? "table" : "kanban";

  // Parse filter state from URL
  const filters = parseFiltersFromUrl(searchParams);

  // Fetch ALL deals — filter is applied client-side so DealsKanban / DealsTable
  // optimistic updates remain coherent with the active filter state.
  const { data: deals } = trpc.salesAnalytics.deals.list.useQuery();

  // Apply filters — `new Date()` at render time is intentional; the tRPC query
  // refetch will invalidate the cache and re-render, keeping "now" fresh.
  const filteredDeals = deals
    ? applyDealFilters(deals, filters, new Date())
    : undefined;

  const handleViewChange = useCallback(
    (nextView: DealView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextView);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  function handleResetFilters() {
    const serialized = serializeFiltersToUrl(EMPTY_FILTERS);
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["period", "amountMin", "amountMax", "ownerId"]) {
      params.delete(key);
    }
    for (const [key, value] of Object.entries(serialized)) {
      params.set(key, value);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Determine empty state scenario:
  //   Scenario A — org has zero deals (global empty state handled by DealsKanban/Table)
  //   Scenario B — filters active + filtered result is empty + total deals > 0
  const isFiltersActive = hasActiveFilters(filters);
  const hasAnyDeals = (deals?.length ?? 0) > 0;
  const isFilteredEmpty =
    isFiltersActive && hasAnyDeals && filteredDeals?.length === 0;

  return (
    <>
      {/* Header: title + view toggle + new deal button */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight text-text-primary">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle value={view} onChange={handleViewChange} />
          <Button
            asChild
            variant="outline"
            size="sm"
            aria-label={t("importCtaAria")}
          >
            <Link href={`/${orgSlug}/m/sales/import`}>
              <Upload size={16} strokeWidth={1.5} aria-hidden />
              {t("importCta")}
            </Link>
          </Button>
          <NewDealDialog ownerId={ownerId} newDealLabel={newDealLabel} />
        </div>
      </header>

      {/* Filter bar — between header and board body */}
      <DealFilters deals={deals} />

      {/* Filtered empty state — takes priority over the board when active */}
      {isFilteredEmpty ? (
        <FilteredEmptyState onReset={handleResetFilters} />
      ) : view === "kanban" ? (
        <DealsKanban filteredDeals={filteredDeals} />
      ) : (
        <DealsTable filteredDeals={filteredDeals} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// FilteredEmptyState — shown only when filters are active + nothing matches
// ---------------------------------------------------------------------------

interface FilteredEmptyStateProps {
  onReset: () => void;
}

function FilteredEmptyState({ onReset }: FilteredEmptyStateProps) {
  const t = useTranslations("modules.salesAnalytics.deals");

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
        <FilterX
          className="size-5 text-text-tertiary"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">
          {t("empty.filtered.title")}
        </p>
        <p className="text-sm text-text-secondary">
          {t("empty.filtered.description")}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("empty.filtered.cta")}
      </Button>
    </div>
  );
}
