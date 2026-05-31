"use client";
// "use client" justification: manages drag-over state (useState), handles
// DOM drag events (onDragOver, onDrop), and triggers a hidden file input
// programmatically — all browser-only concerns.

import { useRef, useState, useCallback } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@modulo/ui/components/button";

import type { ParsedFile, ImportParseError } from "@/lib/import-parse";
import { parseImportFile, extractImportParseError } from "@/lib/import-parse";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls";
const ACCEPTED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportUploadProps {
  onParsed: (file: File, parsed: ParsedFile) => void;
  onError: (err: ImportParseError) => void;
  /** Fired right before parsing begins (after the size guard). Lets the parent
   *  flip its isParsing flag so the busy state ("Analyse du fichier…") shows. */
  onParsingStart: () => void;
  isParsing: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportUpload({
  onParsed,
  onError,
  onParsingStart,
  isParsing,
}: ImportUploadProps) {
  const t = useTranslations("modules.salesAnalytics.import.upload");

  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Size guard — checked before parsing to give immediate feedback.
      if (file.size > MAX_FILE_SIZE) {
        onError({ code: "FILE_TOO_LARGE" });
        return;
      }

      // Signal to the parent that parsing has begun, so its `isParsing` flag
      // flips to true and the dropzone shows "Analyse du fichier…".
      onParsingStart();

      try {
        const parsed = await parseImportFile(file);
        onParsed(file, parsed);
      } catch (err) {
        onError(extractImportParseError(err));
      }
    },
    [onParsed, onError, onParsingStart],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isParsing) return;

      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile, isParsing],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isParsing) setIsDragOver(true);
    },
    [isParsing],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset so the same file can be re-selected after an error.
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  const handleButtonClick = useCallback(() => {
    if (!isParsing) inputRef.current?.click();
  }, [isParsing]);

  const isDisabled = isParsing;

  return (
    <div
      role="region"
      aria-label={t("aria")}
      aria-busy={isParsing}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-drag-over={isDragOver}
      className={[
        "flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center transition-colors duration-200",
        "border-border-subtle",
        isDragOver && !isDisabled
          ? "bg-surface-2"
          : "bg-surface-1",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-default",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={isDisabled}
        onChange={handleInputChange}
      />

      {/* Icon */}
      <div className="flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-surface-2">
        <FileSpreadsheet
          className="size-5 text-text-tertiary"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      {/* Copy */}
      <div className="flex flex-col gap-1">
        {isParsing ? (
          <p className="text-sm font-medium text-text-primary">{t("parsing")}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary">{t("title")}</p>
            <p className="text-sm text-text-secondary">{t("helper")}</p>
            <p className="mt-1 text-xs text-text-tertiary">{t("formats")}</p>
          </>
        )}
      </div>

      {/* CTA button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={handleButtonClick}
        className="focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("cta")}
      </Button>
    </div>
  );
}

// Export the accepted MIME types for validation use elsewhere
export { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE };
