"use client";
// "use client" justification: receives ParsedFile state from the parent
// ImportView and renders a dynamic data table. Although the component has
// no local state, it is composed with other Client Components and receives
// live data, so it must be a Client Component to avoid hydration mismatches.

import { useTranslations } from "next-intl";

import { Badge } from "@modulo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@modulo/ui/components/table";

import type { ParsedFile } from "@/lib/import-parse";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREVIEW_MAX_ROWS_DEFAULT = 50;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImportPreviewProps {
  parsed: ParsedFile;
  fileName: string | null;
  /** Override the max number of preview rows. Defaults to 50. */
  maxRows?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportPreview({ parsed, fileName, maxRows = PREVIEW_MAX_ROWS_DEFAULT }: ImportPreviewProps) {
  const t = useTranslations("modules.salesAnalytics.import.preview");

  const previewRows = parsed.rows.slice(0, maxRows);
  const isTruncated = parsed.rowCount > maxRows;

  return (
    <div className="flex flex-col gap-3">
      {/* Preview header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-text-secondary">
          {t("header", { fileName: fileName ?? "—", count: parsed.rowCount })}
        </p>

        {parsed.sheetName && (
          <Badge variant="secondary" className="text-xs">
            {t("sheetName", { name: parsed.sheetName })}
          </Badge>
        )}

        {isTruncated && (
          <Badge variant="outline" className="text-xs">
            {t("truncatedHint", { total: parsed.rowCount })}
          </Badge>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              {parsed.headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap text-xs">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {parsed.headers.map((header) => {
                  const value = row[header] ?? "";
                  return (
                    <TableCell
                      key={header}
                      className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                    >
                      {value.trim() === "" ? (
                        // em-dash is allowed in table preview cells
                        // (design-system §7: "valeur table — not copy user-facing")
                        <span
                          className="text-text-tertiary"
                          aria-label={t("emptyCell")}
                        >
                          —
                        </span>
                      ) : (
                        <span className="text-text-primary">{value}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
