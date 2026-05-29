"use client";
// "use client" justification: reads URLSearchParams (useSearchParams), writes
// to URL (useRouter.replace), manages debounced amount inputs (useEffect +
// useState), and handles all event handlers on the filter controls.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { PERIOD_PRESETS } from "@modulo/sales-analytics/lib/period-presets";

import { Button } from "@modulo/ui/components/button";
import { Input } from "@modulo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@modulo/ui/components/select";

import {
  ALL_OWNERS,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseFiltersFromUrl,
  serializeFiltersToUrl,
  type DealFilters,
  type FilterableDeal,
} from "@/lib/sales-deal-filters";

// ---------------------------------------------------------------------------
// Owner descriptor — derived from the deals list (no extra tRPC query)
// ---------------------------------------------------------------------------

interface OwnerOption {
  id: string;
  name: string;
}

/**
 * Extract distinct { id, name } owner pairs from the deals list.
 * Uses a Map keyed by ownerId to deduplicate — O(n), allocation-friendly.
 */
function extractOwners(deals: readonly FilterableDeal[]): OwnerOption[] {
  const map = new Map<string, string>();
  for (const deal of deals) {
    if (!map.has(deal.ownerId)) {
      map.set(deal.ownerId, deal.ownerName ?? deal.ownerId);
    }
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DealFiltersProps {
  /**
   * The full (unfiltered) deal list — used to populate the owner select.
   * `undefined` = still loading → owner select is disabled.
   */
  deals: readonly FilterableDeal[] | undefined;
}

// ---------------------------------------------------------------------------
// DealFilters component
// ---------------------------------------------------------------------------

export function DealFilters({ deals }: DealFiltersProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current filters parsed from the URL (source of truth).
  const filters = parseFiltersFromUrl(searchParams);

  // Local state for the amount inputs — we debounce before writing to URL
  // to avoid polluting browser history on every keystroke.
  const [localAmountMin, setLocalAmountMin] = useState<string>(
    filters.amountMin !== null ? String(filters.amountMin) : "",
  );
  const [localAmountMax, setLocalAmountMax] = useState<string>(
    filters.amountMax !== null ? String(filters.amountMax) : "",
  );

  // Keep local amount inputs in sync when the URL changes externally (e.g.
  // user clicks "Reset filters" which clears the URL params). The dep array
  // intentionally uses the derived primitives `filters.amountMin` and
  // `filters.amountMax` rather than the whole `filters` object to avoid
  // triggering on every render (parseFiltersFromUrl creates a new object each time).
  useEffect(() => {
    setLocalAmountMin(filters.amountMin !== null ? String(filters.amountMin) : "");
    setLocalAmountMax(filters.amountMax !== null ? String(filters.amountMax) : "");
  }, [filters.amountMin, filters.amountMax]);

  // Debounce refs — hold the setTimeout id so we can clearTimeout on re-type.
  const minDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // URL write helper — always use router.replace (no history spam)
  // -------------------------------------------------------------------------

  const applyFilters = useCallback(
    (next: DealFilters) => {
      const serialized = serializeFiltersToUrl(next);
      // Preserve unrelated params (e.g. ?view=kanban) while updating filters.
      const params = new URLSearchParams(searchParams.toString());

      // Remove all filter keys first, then re-add active ones.
      for (const key of ["period", "amountMin", "amountMax", "ownerId"]) {
        params.delete(key);
      }
      for (const [key, value] of Object.entries(serialized)) {
        params.set(key, value);
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // -------------------------------------------------------------------------
  // Period change
  // -------------------------------------------------------------------------

  function handlePeriodChange(value: string) {
    // periodPresetSchema values are safe here — Select only emits PERIOD_PRESETS ids
    applyFilters({ ...filters, period: value as DealFilters["period"] });
  }

  // -------------------------------------------------------------------------
  // Amount min — debounced 300ms
  // -------------------------------------------------------------------------

  function handleAmountMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalAmountMin(raw);

    if (minDebounceRef.current) clearTimeout(minDebounceRef.current);
    minDebounceRef.current = setTimeout(() => {
      const parsed = parseFloat(raw);
      const amountMin = raw === "" || isNaN(parsed) || parsed < 0 ? null : parsed;
      applyFilters({ ...filters, amountMin });
    }, 300);
  }

  // -------------------------------------------------------------------------
  // Amount max — debounced 300ms
  // -------------------------------------------------------------------------

  function handleAmountMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocalAmountMax(raw);

    if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current);
    maxDebounceRef.current = setTimeout(() => {
      const parsed = parseFloat(raw);
      const amountMax = raw === "" || isNaN(parsed) || parsed < 0 ? null : parsed;
      applyFilters({ ...filters, amountMax });
    }, 300);
  }

  // -------------------------------------------------------------------------
  // Owner change
  // -------------------------------------------------------------------------

  function handleOwnerChange(value: string) {
    const ownerId = value === ALL_OWNERS ? null : value;
    applyFilters({ ...filters, ownerId });
  }

  // -------------------------------------------------------------------------
  // Reset all filters
  // -------------------------------------------------------------------------

  function handleReset() {
    applyFilters(EMPTY_FILTERS);
  }

  // -------------------------------------------------------------------------
  // Owner select options — derived from the deals list
  // -------------------------------------------------------------------------

  const owners = deals ? extractOwners(deals) : [];
  const isOwnerSelectDisabled = deals === undefined || deals.length === 0;

  const isActive = hasActiveFilters(filters);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      aria-label={t("filters.ariaLabel")}
      role="group"
    >
      {/* Period select */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-period"
          className="text-xs font-medium text-text-secondary"
        >
          {t("filters.period.label")}
        </label>
        <Select
          value={filters.period}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger
            id="filter-period"
            className="h-8 w-32 text-xs"
            aria-label={t("filters.period.label")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* PERIOD_PRESETS — source unique, never hardcoded */}
            {PERIOD_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id} className="text-xs">
                {t(`filters.period.${preset.label}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount min input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-amount-min"
          className="text-xs font-medium text-text-secondary"
        >
          {t("filters.amount.minLabel")}
        </label>
        <Input
          id="filter-amount-min"
          type="number"
          min="0"
          step="1"
          className="h-8 w-32 text-xs"
          placeholder={t("filters.amount.minPlaceholder")}
          value={localAmountMin}
          onChange={handleAmountMinChange}
          aria-label={t("filters.amount.minLabel")}
        />
      </div>

      {/* Amount max input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-amount-max"
          className="text-xs font-medium text-text-secondary"
        >
          {t("filters.amount.maxLabel")}
        </label>
        <Input
          id="filter-amount-max"
          type="number"
          min="0"
          step="1"
          className="h-8 w-32 text-xs"
          placeholder={t("filters.amount.maxPlaceholder")}
          value={localAmountMax}
          onChange={handleAmountMaxChange}
          aria-label={t("filters.amount.maxLabel")}
        />
      </div>

      {/* Owner select */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-owner"
          className="text-xs font-medium text-text-secondary"
        >
          {t("filters.owner.label")}
        </label>
        <Select
          value={filters.ownerId ?? ALL_OWNERS}
          onValueChange={handleOwnerChange}
          disabled={isOwnerSelectDisabled}
        >
          <SelectTrigger
            id="filter-owner"
            className="h-8 w-44 text-xs"
            aria-label={t("filters.owner.label")}
          >
            <SelectValue placeholder={t("filters.owner.all")} />
          </SelectTrigger>
          <SelectContent>
            {/* ALL_OWNERS sentinel → null at URL boundary (avoids Radix value="" bug) */}
            <SelectItem value={ALL_OWNERS} className="text-xs">
              {t("filters.owner.all")}
            </SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id} className="text-xs">
                {owner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reset button — visible only when at least one filter is active */}
      {isActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          aria-label={t("filters.resetAria")}
          className="h-8 gap-1.5 self-end text-xs text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={14} strokeWidth={1.5} aria-hidden />
          {t("filters.reset")}
        </Button>
      ) : null}
    </div>
  );
}
