"use client";
// "use client" justification: uses useMemo for client-side validation, renders
// interactive buttons (onContinue / onBack), uses SubmitButton with
// isLoading state for the tRPC mutation, and displays a live summary of
// validated rows.

import { useMemo } from "react";
import { CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@modulo/ui/components/button";
import { SubmitButton } from "@modulo/ui/components/submit-button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@modulo/ui/components/table";

import { validateImportRows } from "@/lib/import-validate";
import type {
  ImportDraftRow,
  ValidatedRow,
} from "@/lib/import-validate";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of rows displayed in the preview table. */
const MAX_PREVIEW_ROWS = 100;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportValidationProps {
  /** The mapped draft rows from Phase 2 (output of applyMapping). */
  draftRows: ImportDraftRow[];
  /** Original file name — shown in the header. */
  fileName: string | null;
  /** Called when the user confirms — receives only the valid rows. */
  onContinue: (validRows: ValidatedRow[]) => void;
  /** Called when the user goes back to the mapping step. */
  onBack: () => void;
  /**
   * When true, the import mutation is in flight.
   * Disables both the import button (SubmitButton shows loading) and the
   * back button to prevent double-mutation or navigating away mid-import.
   */
  isImporting: boolean;
}

// ---------------------------------------------------------------------------
// EmptyCell — reusable empty-value placeholder
// ---------------------------------------------------------------------------

function EmptyCell() {
  // Em-dash is acceptable as a table cell value (not user-facing copy)
  return <span className="text-text-tertiary select-none">&mdash;</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportValidation({
  draftRows,
  fileName,
  onContinue,
  onBack,
  isImporting,
}: ImportValidationProps) {
  const t = useTranslations("modules.salesAnalytics.import.validation");

  // Validate all rows once — recomputes only when draftRows reference changes.
  const summary = useMemo(() => validateImportRows(draftRows), [draftRows]);

  const { rows, validCount, errorCount } = summary;

  // Rows to display — capped at MAX_PREVIEW_ROWS for performance.
  const displayedRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const isTruncated = rows.length > MAX_PREVIEW_ROWS;

  const handleContinue = () => {
    if (validCount === 0) return;
    onContinue(rows.filter((r) => r.valid));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Header panel ---- */}
      <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
        {/* Title + file name + description */}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-text-primary">{t("title")}</p>
          {fileName !== null && (
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet
                className="size-3.5 shrink-0 text-text-tertiary"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-xs text-text-tertiary">{fileName}</p>
            </div>
          )}
          <p className="text-xs text-text-tertiary">{t("description")}</p>
        </div>

        {/* Counters — announced to screen readers via role="status" */}
        <div
          className="flex flex-wrap items-center gap-3"
          role="status"
          aria-live="polite"
          aria-label={`${t("counters.valid", { count: validCount })}, ${t("counters.error", { count: errorCount })}`}
        >
          {/* Valid counter */}
          <div className="flex items-center gap-1.5">
            <CheckCircle2
              className="size-4 text-success"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="text-sm font-medium text-success">
              {t("counters.valid", { count: validCount })}
            </span>
          </div>

          {/* Error counter — only shown when errors exist */}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle
                className="size-4 text-danger"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-sm font-medium text-danger">
                {t("counters.error", { count: errorCount })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="rounded-lg border border-border-subtle bg-surface-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">{t("columns.index")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.amount")}</TableHead>
              <TableHead>{t("columns.stage")}</TableHead>
              <TableHead>{t("columns.contact")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.errors")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row) => {
              const isError = !row.valid;
              const errorCodes = Object.values(row.errors);

              return (
                <TableRow
                  key={row.index}
                  aria-invalid={isError ? "true" : undefined}
                  className={
                    isError
                      ? "border-l-2 border-l-danger bg-danger/5"
                      : undefined
                  }
                >
                  {/* # — 1-based for user readability */}
                  <TableCell className="text-text-tertiary text-xs">
                    {row.index + 1}
                  </TableCell>

                  {/* Status badge */}
                  <TableCell>
                    {isError ? (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-danger/10 text-danger">
                        {t("status.error")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-success/10 text-success">
                        {t("status.valid")}
                      </span>
                    )}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    {row.raw.name ? (
                      <span className="text-sm text-text-primary">
                        {row.raw.name}
                      </span>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>

                  {/* Amount */}
                  <TableCell>
                    {row.raw.amount ? (
                      <span className="text-sm text-text-secondary">
                        {row.raw.amount}
                      </span>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>

                  {/* Stage */}
                  <TableCell>
                    {row.raw.stage ? (
                      <span className="text-sm text-text-secondary">
                        {row.raw.stage}
                      </span>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>

                  {/* Contact name */}
                  <TableCell>
                    {row.raw.contact_name ? (
                      <span className="text-sm text-text-secondary">
                        {row.raw.contact_name}
                      </span>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>

                  {/* Contact email */}
                  <TableCell>
                    {row.raw.contact_email ? (
                      <span className="text-sm text-text-secondary">
                        {row.raw.contact_email}
                      </span>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>

                  {/* Errors — one message per failing field */}
                  <TableCell>
                    {isError && errorCodes.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {errorCodes.map((code) => (
                          <li key={code} className="text-xs text-danger">
                            {t(`errors.${code}`)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyCell />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Truncate hint — shown inside the panel when rows > MAX_PREVIEW_ROWS */}
        {isTruncated && (
          <div className="border-t border-border-subtle px-4 py-2">
            <p className="text-xs text-text-tertiary">
              {t("truncatedHint", {
                shown: MAX_PREVIEW_ROWS,
                total: rows.length,
              })}
            </p>
          </div>
        )}
      </div>

      {/* ---- Footer ---- */}
      <div className="flex flex-col items-end gap-2">
        {/* Skip warning */}
        {errorCount > 0 && (
          <p className="text-xs text-text-tertiary">
            {t("willSkip", { count: errorCount })}
          </p>
        )}

        <div className="flex items-center gap-2">
          {/* Back button — disabled during import to prevent leaving mid-mutation */}
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onBack}
            disabled={isImporting}
            className="focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("back")}
          >
            {t("back")}
          </Button>

          {/*
            Import button — Convention Modulo CLAUDE.md §5: toute mutation
            tRPC passe par SubmitButton. isLoading shows spinner + loadingLabel,
            prevents double-submit.
          */}
          <SubmitButton
            type="button"
            variant="default"
            size="default"
            disabled={validCount === 0 || isImporting}
            isLoading={isImporting}
            loadingLabel={t("submitLoading")}
            onClick={handleContinue}
            className="focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("continueLabel", { count: validCount })}
          >
            {t("continueLabel", { count: validCount })}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
