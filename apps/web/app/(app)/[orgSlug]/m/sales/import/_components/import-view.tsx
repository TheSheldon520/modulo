"use client";
// "use client" justification: orchestrates local React state (step machine,
// parsed file, error state, isParsing flag, fileName, mapping, draftRows,
// import result), tRPC mutation (importBatch), and composes purely
// client-side children (ImportUpload, ImportPreview, ImportMapping,
// ImportValidation, ImportImporting, ImportReport).

import { useState, useCallback, useMemo } from "react";
import { RotateCcw, HelpCircle, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@modulo/ui/components/button";

// Import from the pure schemas module — never from the router barrel —
// so the client bundle never pulls @trpc/server.
import type { ImportRowInput } from "@modulo/sales-analytics/schemas";

import { trpc } from "@/lib/trpc/client";
import type { ParsedFile, ImportParseError } from "@/lib/import-parse";
import type { ColumnMapping } from "@/lib/import-mapping";
import type { ImportDraftRow, ValidatedRow } from "@/lib/import-validate";
import { applyMapping } from "@/lib/import-mapping";
import { validateImportRows } from "@/lib/import-validate";

import { ImportUpload } from "./import-upload";
import { ImportPreview } from "./import-preview";
import { ImportMapping } from "./import-mapping";
import { ImportValidation } from "./import-validation";
import { ImportImporting } from "./import-importing";
import { ImportReport } from "./import-report";

// ---------------------------------------------------------------------------
// Step machine
// ---------------------------------------------------------------------------

type ImportStep =
  | "upload"
  | "mapping"
  | "validation"
  | "importing"
  | "report";

// ---------------------------------------------------------------------------
// ImportResult type — mirrors the mutation return shape
// ---------------------------------------------------------------------------

interface ImportResult {
  dealsCreated: number;
  contactsCreated: number;
  contactsLinked: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Error state — mirrors the DealsErrorState pattern from deals-table.tsx
interface ImportErrorStateProps {
  err: ImportParseError;
  onReset: () => void;
}

function ImportErrorState({ err, onReset }: ImportErrorStateProps) {
  const t = useTranslations("modules.salesAnalytics.import.errors");

  const message = (() => {
    switch (err.code) {
      case "UNSUPPORTED_FORMAT":
        return t("UNSUPPORTED_FORMAT");
      case "EMPTY_FILE":
        return t("EMPTY_FILE");
      case "FILE_TOO_LARGE":
        return t("FILE_TOO_LARGE");
      case "PARSE_FAILED":
        return t("PARSE_FAILED");
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-6 py-12 text-center">
      <p className="text-sm text-danger">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RotateCcw className="mr-1.5 size-4" strokeWidth={1.5} aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}

// Empty hint — shown while no file has been selected yet
function ImportEmptyHint() {
  const t = useTranslations("modules.salesAnalytics.import.hint");

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
      <HelpCircle
        className="mt-0.5 size-4 shrink-0 text-text-tertiary"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text-secondary">{t("title")}</p>
        <p className="text-sm text-text-tertiary">{t("description")}</p>
      </div>
    </div>
  );
}

// Mini file summary shown above the mapping and validation panels
interface FileSummaryBarProps {
  fileName: string;
  rowCount: number;
  onReset: () => void;
}

function FileSummaryBar({ fileName, rowCount, onReset }: FileSummaryBarProps) {
  const t = useTranslations("modules.salesAnalytics.import.mapping");

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <FileSpreadsheet
          className="size-4 shrink-0 text-text-tertiary"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="truncate text-sm text-text-secondary">
          {t("fileSummary", { fileName, count: rowCount })}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="shrink-0 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <RotateCcw className="mr-1.5 size-4" strokeWidth={1.5} aria-hidden />
        {t("reset")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportView props
// ---------------------------------------------------------------------------

interface ImportViewProps {
  /** Org slug passed from the Server Component page — used by ImportReport. */
  orgSlug: string;
}

// ---------------------------------------------------------------------------
// ImportView — main orchestrator
// ---------------------------------------------------------------------------

export function ImportView({ orgSlug }: ImportViewProps) {
  const t = useTranslations("modules.salesAnalytics.import");

  const [step, setStep] = useState<ImportStep>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<ImportParseError | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Draft rows produced by applyMapping — passed to ImportValidation.
  const [draftRows, setDraftRows] = useState<ImportDraftRow[]>([]);

  // ---------------------------------------------------------------------------
  // Shared validation summary
  //
  // Computed once from draftRows while in validation / importing steps.
  // Passed to ImportValidation (which renders the table) and stored for
  // ImportReport (to show skippedCount = errorCount). This avoids a double
  // `validateImportRows` call and eliminates the prop ping-pong pattern.
  // ---------------------------------------------------------------------------

  const validationSummary = useMemo(
    () =>
      step === "validation" || step === "importing" || step === "report"
        ? validateImportRows(draftRows)
        : null,
    [draftRows, step],
  );

  // ---------------------------------------------------------------------------
  // tRPC mutation
  // ---------------------------------------------------------------------------

  const utils = trpc.useUtils();

  const importBatch = trpc.salesAnalytics.deals.importBatch.useMutation({
    onSuccess: async (data) => {
      setImportResult(data);
      setStep("report");
      // Invalidate the deals list so the table/kanban reflects the import.
      await utils.salesAnalytics.deals.list.invalidate();
    },
    onError: () => {
      toast.error(t("errors.importFailed"));
      // Return to validation so the user can retry without re-uploading.
      setStep("validation");
    },
  });

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  // Called by ImportUpload when parsing succeeded.
  const handleParsed = useCallback((file: File, result: ParsedFile) => {
    setIsParsing(false);
    setParsed(result);
    setFileName(file.name);
    setError(null);
    setStep("mapping");
  }, []);

  // Called by ImportUpload right before parsing begins (after the size guard).
  // Flips the busy flag so the dropzone shows "Analyse du fichier…" and
  // disables the CTA until parsing completes (success or error).
  const handleParsingStart = useCallback(() => {
    setIsParsing(true);
  }, []);

  // Called by ImportUpload when parsing failed (or file too large).
  const handleError = useCallback((err: ImportParseError) => {
    setIsParsing(false);
    setError(err);
    setParsed(null);
    setFileName(null);
    setStep("upload");
  }, []);

  // Full reset — returns to upload and clears all transient state.
  const handleReset = useCallback(() => {
    setParsed(null);
    setError(null);
    setFileName(null);
    setIsParsing(false);
    setDraftRows([]);
    setImportResult(null);
    setStep("upload");
  }, []);

  // Called when the user confirms the mapping — transitions to validation.
  const handleMappingContinue = useCallback(
    (confirmedMapping: ColumnMapping) => {
      if (parsed === null) return;
      setDraftRows(applyMapping(parsed.rows, confirmedMapping));
      setStep("validation");
    },
    [parsed],
  );

  // Called from ImportValidation when the user clicks "Back".
  const handleValidationBack = useCallback(() => {
    setStep("mapping");
  }, []);

  // Called from ImportValidation when the user clicks "Import X deals".
  // Builds the payload from the valid rows and fires the tRPC mutation.
  const handleValidationContinue = useCallback(
    (validRows: ValidatedRow[]) => {
      // validRows only contains rows where valid === true, so parsed is
      // guaranteed to be defined. The filter below is a defensive narrowing.
      const payload: ImportRowInput[] = validRows
        .map((r) => r.parsed)
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .map((p) => ({
          name: p.name,
          amount: p.amount,
          stage: p.stage,
          contactName: p.contactName,
          contactEmail: p.contactEmail,
        }));

      setStep("importing");
      importBatch.mutate({ rows: payload });
    },
    [importBatch],
  );

  // ---------------------------------------------------------------------------
  // Render — step-based
  // ---------------------------------------------------------------------------

  // Step: importing — indeterminate loader overlay
  if (step === "importing") {
    return (
      <ImportImporting rowCount={validationSummary?.validCount ?? 0} />
    );
  }

  // Step: report — import result summary
  if (step === "report" && importResult !== null) {
    return (
      <ImportReport
        result={importResult}
        skippedCount={validationSummary?.errorCount ?? 0}
        orgSlug={orgSlug}
        onReset={handleReset}
      />
    );
  }

  // Step: validation — row-by-row review table
  if (step === "validation" && draftRows.length > 0 && fileName !== null) {
    return (
      <ImportValidation
        draftRows={draftRows}
        fileName={fileName}
        onContinue={handleValidationContinue}
        onBack={handleValidationBack}
        isImporting={importBatch.isPending}
      />
    );
  }

  // Step: mapping — column assignment
  if (step === "mapping" && parsed !== null && fileName !== null) {
    return (
      <div className="flex flex-col gap-4">
        {/* File summary + "choose another file" button */}
        <FileSummaryBar
          fileName={fileName}
          rowCount={parsed.rowCount}
          onReset={handleReset}
        />

        {/* Truncated data preview (10 rows in mapping step for space) */}
        <ImportPreview
          parsed={parsed}
          fileName={fileName}
          maxRows={10}
        />

        {/* Column mapping panel */}
        <ImportMapping
          headers={parsed.headers}
          onContinue={handleMappingContinue}
        />
      </div>
    );
  }

  // Step: upload (default / after reset / after error)
  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone — always visible in upload step */}
      <ImportUpload
        onParsed={handleParsed}
        onError={handleError}
        onParsingStart={handleParsingStart}
        isParsing={isParsing}
      />

      {/* State-dependent hint / error below the dropzone */}
      {error !== null ? (
        <ImportErrorState err={error} onReset={handleReset} />
      ) : (
        <ImportEmptyHint />
      )}
    </div>
  );
}
