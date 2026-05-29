"use client";
// "use client" justification: manages dialog open/close state (useState),
// controlled form fields (useState), tRPC mutation, and event handlers.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Import from the pure schemas module — NOT the router barrel — so the
// client bundle never pulls @trpc/server (which refuses to run in the
// browser and would crash at hydration).
import { DEAL_STAGES, type DealStage } from "@modulo/sales-analytics/schemas";
import { Button } from "@modulo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@modulo/ui/components/dialog";
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
import { makeDealCreateFormSchema } from "@/lib/deal-form-schema";

interface NewDealDialogProps {
  /** session.user.id resolved by the Server Component parent */
  ownerId: string;
  newDealLabel: string;
}

export function NewDealDialog({ ownerId, newDealLabel }: NewDealDialogProps) {
  const t = useTranslations("modules.salesAnalytics.deals");
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DealStage>(DEAL_STAGES[0] ?? "lead");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const createDeal = trpc.salesAnalytics.deals.create.useMutation({
    onSuccess: async () => {
      await utils.salesAnalytics.deals.list.invalidate();
      toast.success(t("dialogs.newDeal.success"));
      handleClose();
    },
    onError: () => {
      toast.error(t("dialogs.newDeal.error"));
    },
  });

  function handleClose() {
    setOpen(false);
    // Reset form on close — defensive: also fires after success.
    setName("");
    setAmount("");
    setStage(DEAL_STAGES[0]);
    setFieldError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) handleClose();
    else setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);

    const schema = makeDealCreateFormSchema(t);

    // Convert the HTML number input value to the Zod-expected decimal string.
    // HTML <input type="number"> gives us a string like "12500.5" — we parse
    // it and re-stringify to match `^\d+(\.\d{1,2})?$`. We use toFixed(2)
    // then strip trailing zeros to stay within 2 decimal places max.
    const rawFloat = parseFloat(amount);
    const amountStr = isNaN(rawFloat)
      ? amount
      : rawFloat % 1 === 0
        ? String(rawFloat)
        : rawFloat.toFixed(2).replace(/\.?0+$/, "");

    const parsed = schema.safeParse({ name, amount: amountStr, stage });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? t("dialogs.newDeal.error"));
      return;
    }

    createDeal.mutate({
      name: parsed.data.name,
      amount: parsed.data.amount,
      stage: parsed.data.stage,
      ownerId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus strokeWidth={1.5} />
          {newDealLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.newDeal.title")}</DialogTitle>
          <DialogDescription>{t("dialogs.newDeal.description")}</DialogDescription>
        </DialogHeader>

        <form
          id="new-deal-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-4"
        >
          {/* Nom du deal */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="deal-name"
              className="text-sm text-text-secondary"
            >
              {t("dialogs.newDeal.fields.name")}
            </label>
            <Input
              id="deal-name"
              type="text"
              placeholder={t("dialogs.newDeal.fields.namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={createDeal.isPending}
              required
              maxLength={200}
            />
          </div>

          {/* Montant */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="deal-amount"
              className="text-sm text-text-secondary"
            >
              {t("dialogs.newDeal.fields.amount")}
            </label>
            <Input
              id="deal-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              disabled={createDeal.isPending}
              required
            />
          </div>

          {/* Étape */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="deal-stage"
              className="text-sm text-text-secondary"
            >
              {t("dialogs.newDeal.fields.stage")}
            </label>
            <Select
              value={stage}
              // The SelectItem values below are always drawn from
              // DEAL_STAGES (a const tuple) — so `v` is guaranteed to be a
              // DealStage at runtime. shadcn's onValueChange is typed
              // `(value: string) => void`, hence the narrowing cast.
              onValueChange={(v) => setStage(v as DealStage)}
              disabled={createDeal.isPending}
            >
              <SelectTrigger id="deal-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`stages.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field-level validation error */}
          {fieldError ? (
            <p className="text-sm text-danger" role="alert">
              {fieldError}
            </p>
          ) : null}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createDeal.isPending}
          >
            Annuler
          </Button>
          {/* Convention T1.0b CLAUDE.md §5 — toute mutation passe par SubmitButton */}
          <SubmitButton
            type="submit"
            form="new-deal-form"
            isLoading={createDeal.isPending}
            loadingLabel={t("dialogs.newDeal.submitting")}
          >
            {t("dialogs.newDeal.submit")}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
