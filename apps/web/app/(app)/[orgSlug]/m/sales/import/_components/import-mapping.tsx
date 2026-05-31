"use client";
// "use client" justification: manages local mapping state (useState),
// reacts to user select changes (event handlers), and renders Radix Select
// which is a client-only component. No tRPC calls in Phase 2 — onContinue
// will be wired to validation in Phase 3.

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@modulo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@modulo/ui/components/select";

import {
  DEAL_TARGET_FIELDS,
  UNMAPPED,
  detectColumnMapping,
  isMappingComplete,
} from "@/lib/import-mapping";
import type { ColumnMapping, DealTargetKey } from "@/lib/import-mapping";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportMappingProps {
  headers: readonly string[];
  onContinue: (mapping: ColumnMapping) => void;
}

// ---------------------------------------------------------------------------
// Field metadata (labels + helpers) — resolved via explicit translation keys
// to avoid dynamic key interpolation that confuses ESLint.
// ---------------------------------------------------------------------------

interface FieldMeta {
  label: string;
  helper: string;
}

function useFieldMeta(): Record<DealTargetKey, FieldMeta> {
  const t = useTranslations("modules.salesAnalytics.import.mapping.fields");
  return {
    name:          { label: t("name.label"),          helper: t("name.helper") },
    amount:        { label: t("amount.label"),         helper: t("amount.helper") },
    stage:         { label: t("stage.label"),          helper: t("stage.helper") },
    contact_name:  { label: t("contact_name.label"),  helper: t("contact_name.helper") },
    contact_email: { label: t("contact_email.label"), helper: t("contact_email.helper") },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportMapping({ headers, onContinue }: ImportMappingProps) {
  const t = useTranslations("modules.salesAnalytics.import.mapping");
  const fieldMeta = useFieldMeta();

  // Initialise mapping via auto-detection — lazy initialiser runs only once.
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    detectColumnMapping(headers),
  );

  const canContinue = isMappingComplete(mapping);

  // Build the list of required field labels that are still UNMAPPED, for
  // the hint text shown above the "Continuer" button.
  const missingRequiredLabels = DEAL_TARGET_FIELDS.filter(
    (f) => f.required && mapping[f.key] === UNMAPPED,
  ).map((f) => fieldMeta[f.key].label);

  const handleValueChange = (targetKey: DealTargetKey) => (fileHeader: string) => {
    setMapping((prev) => ({ ...prev, [targetKey]: fileHeader }));
  };

  const handleContinue = () => {
    if (!canContinue) return;
    // Phase 3 will wire the validation step here.
    // For now, forward the mapping to the parent (which will extend ImportStep).
    onContinue(mapping);
  };

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border-subtle bg-surface-1 p-5">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{t("title")}</p>
        <p className="text-xs text-text-tertiary">{t("description")}</p>
      </div>

      {/* Mapping rows — one per target field */}
      <div className="flex flex-col gap-4">
        {DEAL_TARGET_FIELDS.map((field) => {
          const { key } = field;
          const meta = fieldMeta[key];
          const selectId = `mapping-select-${key}`;

          return (
            <div
              key={key}
              className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:items-center"
            >
              {/* Left: label + helper */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor={selectId}
                    className="text-sm font-medium text-text-primary"
                  >
                    {meta.label}
                  </label>
                  {field.required && (
                    <span className="text-2xs font-medium uppercase tracking-wide text-danger">
                      {t("required")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">{meta.helper}</p>
              </div>

              {/* Center: directional arrow indicator */}
              <div
                className="mt-1 select-none text-text-tertiary sm:mt-0"
                aria-hidden
              >
                &rarr;
              </div>

              {/* Right: column picker Select */}
              <Select
                value={mapping[key]}
                onValueChange={handleValueChange(key)}
              >
                <SelectTrigger
                  id={selectId}
                  size="default"
                  className="w-full focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={meta.label}
                >
                  <SelectValue placeholder={t("unmapped")} />
                </SelectTrigger>
                <SelectContent>
                  {/* Sentinel: "not mapped" — required by Radix (value cannot be "") */}
                  <SelectItem value={UNMAPPED}>
                    <span className="text-text-tertiary">{t("unmapped")}</span>
                  </SelectItem>

                  {/* One item per file header from the parsed file */}
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Footer: missing-required hint + Continue button */}
      <div className="flex flex-col items-end gap-2">
        {!canContinue && missingRequiredLabels.length > 0 && (
          <p className="text-xs text-text-tertiary">
            {t("missingRequired", { fields: missingRequiredLabels.join(", ") })}
          </p>
        )}
        <Button
          type="button"
          variant="default"
          size="default"
          disabled={!canContinue}
          onClick={handleContinue}
          className="focus-visible:ring-2 focus-visible:ring-accent"
          aria-disabled={!canContinue}
        >
          {t("continueLabel")}
        </Button>
      </div>
    </div>
  );
}
