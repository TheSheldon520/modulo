"use client";
// "use client" justification: manages form state (useState), tRPC mutations,
// event handlers, and imperative toast API — all requiring client-side execution.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// Schemas — import from pure schemas module, NOT the router barrel
import { type DealStage } from "@modulo/sales-analytics/schemas";
import { STAGES } from "@modulo/sales-analytics/lib/stages";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@modulo/ui/components/sheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@modulo/ui/components/alert-dialog";
import { Button } from "@modulo/ui/components/button";
import { Input } from "@modulo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@modulo/ui/components/select";
import { SubmitButton } from "@modulo/ui/components/submit-button";

import { trpc } from "@/lib/trpc/client";
import { makeDealUpdateFormSchema } from "@/lib/deal-update-form-schema";
import { getOwnerInitials } from "@/lib/owner-avatar";

import type { DealRow } from "./deal-card";

// ---------------------------------------------------------------------------
// Sentinels
// ---------------------------------------------------------------------------

/**
 * Sentinel value for the "no contact" `<SelectItem>` — Radix Select forbids
 * `value=""` at runtime ("A <Select.Item /> must have a value prop that is
 * not an empty string"). We pick a non-UUID sentinel that is impossible to
 * collide with a real contact id, and translate to/from `null` at the two
 * boundaries:
 *   - initial state           :  deal.contactId ?? NO_CONTACT
 *   - submit (before mutate)  :  raw === NO_CONTACT ? null : raw
 * The Zod schema stays a plain `z.string()` (accepts both sentinel and UUID);
 * the mapping happens AFTER `safeParse` so the schema's role stays
 * format-only — Zod doesn't know about UI sentinels.
 */
const NO_CONTACT = "__none__";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DealSidePanelProps {
  deal: DealRow | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Date formatting helper — fr-FR locale, no server deps
// ---------------------------------------------------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return DATE_FORMATTER.format(d);
}

// ---------------------------------------------------------------------------
// Read-only info row
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="text-sm text-text-secondary">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation AlertDialog (inner component)
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  dealName: string;
  dealId: string;
  onDeleted: () => void;
}

function DeleteConfirmDialog({
  dealName,
  dealId,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const deleteDeal = trpc.salesAnalytics.deals.delete.useMutation({
    onSuccess: () => {
      void utils.salesAnalytics.deals.list.invalidate();
      void utils.salesAnalytics.overview.invalidate();
      toast.success(t("sidePanel.actions.deleteSuccess"));
      setOpen(false);
      onDeleted();
    },
    onError: () => {
      toast.error(t("sidePanel.actions.deleteError"));
    },
  });

  function handleConfirm() {
    deleteDeal.mutate({ id: dealId });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" type="button">
          {t("sidePanel.actions.delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("sidePanel.deleteConfirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("sidePanel.deleteConfirm.description", { name: dealName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="ghost"
            disabled={deleteDeal.isPending}
            onClick={() => setOpen(false)}
          >
            {t("sidePanel.deleteConfirm.cancel")}
          </AlertDialogCancel>
          {/* Convention CLAUDE.md §5 — toute mutation passe par SubmitButton */}
          <SubmitButton
            variant="destructive"
            isLoading={deleteDeal.isPending}
            loadingLabel={t("sidePanel.actions.deleting")}
            onClick={handleConfirm}
            type="button"
          >
            {t("sidePanel.deleteConfirm.confirm")}
          </SubmitButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Edit form (inner component — only renders when deal is non-null)
// ---------------------------------------------------------------------------

interface DealEditFormProps {
  deal: DealRow;
  onClose: () => void;
}

function DealEditForm({ deal, onClose }: DealEditFormProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  const utils = trpc.useUtils();

  // Form state — initialised from the deal prop.
  // `key={deal.id}` on the parent ensures this resets when a different deal is opened.
  const [name, setName] = useState(deal.name);
  const [amount, setAmount] = useState(deal.amount);
  // contactId: NO_CONTACT sentinel = "no contact" (maps to null at wire boundary;
  // see top-of-file rationale on why an empty string can't be used here).
  const [contactId, setContactId] = useState<string>(
    deal.contactId ?? NO_CONTACT,
  );
  const [stage, setStage] = useState<DealStage>(deal.stage as DealStage);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Contacts query — fires only while the Sheet is mounted (deal non-null)
  const { data: contactsData } = trpc.salesAnalytics.contacts.list.useQuery();

  const updateDeal = trpc.salesAnalytics.deals.update.useMutation({
    onSuccess: () => {
      void utils.salesAnalytics.deals.list.invalidate();
      void utils.salesAnalytics.overview.invalidate();
      toast.success(t("sidePanel.actions.saveSuccess"));
      onClose();
    },
    onError: () => {
      toast.error(t("sidePanel.actions.saveError"));
    },
  });

  const ownerInitials = getOwnerInitials(deal.ownerName);
  const ownerLabel = deal.ownerName ?? t("kanban.noOwner");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);

    const schema = makeDealUpdateFormSchema(t);

    // Normalise amount: same pattern as NewDealDialog — convert HTML number
    // input value to the Zod-expected decimal string format.
    const rawFloat = parseFloat(amount);
    const amountStr = isNaN(rawFloat)
      ? amount
      : rawFloat % 1 === 0
        ? String(rawFloat)
        : rawFloat.toFixed(2).replace(/\.?0+$/, "");

    const parsed = schema.safeParse({
      name,
      amount: amountStr,
      stage,
      contactId,
    });

    if (!parsed.success) {
      setFieldError(
        parsed.error.issues[0]?.message ?? t("sidePanel.actions.saveError"),
      );
      return;
    }

    updateDeal.mutate({
      id: deal.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      stage: parsed.data.stage,
      // Sentinel → null (no contact); UUID string → UUID
      contactId:
        parsed.data.contactId === NO_CONTACT ? null : parsed.data.contactId,
    });
  }

  return (
    <form
      id="deal-edit-form"
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
        {/* Editable fields */}
        <div className="flex flex-col gap-4">
          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-deal-name"
              className="text-xs font-medium text-text-secondary"
            >
              {t("sidePanel.fields.name")}
            </label>
            <Input
              id="edit-deal-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={updateDeal.isPending}
              required
              maxLength={200}
            />
          </div>

          {/* Montant */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-deal-amount"
              className="text-xs font-medium text-text-secondary"
            >
              {t("sidePanel.fields.amount")}
            </label>
            <Input
              id="edit-deal-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={updateDeal.isPending}
              required
            />
          </div>

          {/* Étape */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-deal-stage"
              className="text-xs font-medium text-text-secondary"
            >
              {t("sidePanel.fields.stage")}
            </label>
            <Select
              value={stage}
              onValueChange={(v) => setStage(v as DealStage)}
              disabled={updateDeal.isPending}
            >
              <SelectTrigger id="edit-deal-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Source unique des stages — STAGES de lib/stages.ts */}
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {t(`stages.${s.label}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-deal-contact"
              className="text-xs font-medium text-text-secondary"
            >
              {t("sidePanel.fields.contact")}
            </label>
            <Select
              value={contactId}
              onValueChange={(v) => setContactId(v)}
              disabled={updateDeal.isPending}
            >
              <SelectTrigger id="edit-deal-contact" className="w-full">
                <SelectValue placeholder={t("sidePanel.fields.noContact")} />
              </SelectTrigger>
              <SelectContent>
                {/* NO_CONTACT sentinel → null at wire (no contact selected) */}
                <SelectItem value={NO_CONTACT}>
                  {t("sidePanel.fields.noContact")}
                </SelectItem>
                {contactsData?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ? `${c.name} · ${c.company}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Field-level validation error */}
        {fieldError !== null ? (
          <p className="text-sm text-danger" role="alert">
            {fieldError}
          </p>
        ) : null}

        {/* Separator */}
        <div className="h-px w-full bg-border-subtle" aria-hidden />

        {/* Read-only info section */}
        <div className="flex flex-col gap-3">
          {/* Owner avatar + name */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-tertiary">
              {t("sidePanel.fields.owner")}
            </span>
            <div className="flex items-center gap-2">
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-2xs font-semibold text-accent"
                aria-hidden
              >
                {ownerInitials}
              </div>
              <span className="text-sm text-text-secondary">{ownerLabel}</span>
            </div>
          </div>

          <InfoRow
            label={t("sidePanel.fields.createdAt")}
            value={formatDate(deal.createdAt)}
          />
          <InfoRow
            label={t("sidePanel.fields.updatedAt")}
            value={formatDate(deal.updatedAt)}
          />
          <InfoRow
            label={t("sidePanel.fields.closedAt")}
            value={
              deal.closedAt !== null
                ? formatDate(deal.closedAt)
                : t("sidePanel.fields.closedAtNull")
            }
          />
        </div>
      </div>

      {/* Footer — Delete (left) + Cancel / Save (right) */}
      <SheetFooter className="flex-row items-center justify-between border-t border-border-subtle px-4 py-3">
        <DeleteConfirmDialog
          dealName={deal.name}
          dealId={deal.id}
          onDeleted={onClose}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={updateDeal.isPending}
          >
            {t("sidePanel.actions.cancel")}
          </Button>
          {/* Convention CLAUDE.md §5 — toute mutation passe par SubmitButton */}
          <SubmitButton
            type="submit"
            form="deal-edit-form"
            size="sm"
            isLoading={updateDeal.isPending}
            loadingLabel={t("sidePanel.actions.saving")}
          >
            {t("sidePanel.actions.save")}
          </SubmitButton>
        </div>
      </SheetFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component — DealSidePanel
// ---------------------------------------------------------------------------

export function DealSidePanel({ deal, onClose }: DealSidePanelProps) {
  const t = useTranslations("modules.salesAnalytics.deals");

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Sheet open={deal !== null} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        // sm:max-w-md for a comfortable edit panel (wider than default sm:max-w-sm)
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="border-b border-border-subtle px-4 py-4">
          <SheetTitle>{t("sidePanel.title")}</SheetTitle>
          <SheetDescription>{t("sidePanel.description")}</SheetDescription>
        </SheetHeader>

        {/* key={deal.id} ensures form state resets when a different deal is opened */}
        {deal !== null ? (
          <DealEditForm key={deal.id} deal={deal} onClose={onClose} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
