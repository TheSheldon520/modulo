// modules/sales-analytics/schemas.ts
//
// Pure-isomorphic Zod schemas + canonical stage codes for the Sales Analytics
// module. This file is consumable from BOTH server and client without dragging
// any server-only code into the browser bundle (no `@trpc/server`, no Drizzle,
// no `@modulo/api`). Only `zod` is imported.
//
// This separation is the canonical Modulo convention for any module that
// exposes schemas/enums to the UI layer: the wire-validation lives in
// `schemas.ts`, the procedures live in `router.ts`. Client Components MUST
// import from `@modulo/<id>/schemas` — never from `@modulo/<id>` (the root
// barrel re-exports the router which transitively pulls @trpc/server, and
// Next would crash at hydration with "@trpc/server cannot be used in the
// browser").
//
// Same constraint applies to any `lib/*-form-schema.ts` factory in `apps/web`
// — those wrap these schemas with i18n messages but still must import them
// from this file, not from the router barrel.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Canonical stage codes
// ---------------------------------------------------------------------------

/**
 * Stage codes recognised by the module. Lowercase canonical codes are the
 * persisted form — UI labels are resolved via i18n at render time
 * (`modules.salesAnalytics.deals.stages.{lead,qualified,proposal,won,lost}`),
 * so the persisted value never carries display concerns. Kept as a small
 * literal union for now; T1.5 will switch to a dynamic check against the
 * org's `sales_pipeline_stages` rows once stage CRUD ships.
 */
export const DEAL_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

export const uuidSchema = z.string().uuid();

/**
 * Hex `#RRGGBB` colour. Strict 6-char form for T1.3 — OKLCH / token strings
 * will be considered alongside the design-system rollout (T1.5+).
 */
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export const dealCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  stage: z.enum(DEAL_STAGES),
  /**
   * Decimal amount as a string at the wire layer — matches Drizzle's `numeric`
   * default and keeps precision intact above 2^53. The schema validates
   * shape; the procedure stores it verbatim.
   */
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive decimal (max 2 dp)"),
  ownerId: uuidSchema,
  contactId: uuidSchema.nullable().optional(),
  closedAt: z.date().nullable().optional(),
});

export const dealUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a positive decimal (max 2 dp)")
    .optional(),
  ownerId: uuidSchema.optional(),
  contactId: uuidSchema.nullable().optional(),
  closedAt: z.date().nullable().optional(),
});

export type DealCreateInput = z.infer<typeof dealCreateSchema>;
export type DealUpdateInput = z.infer<typeof dealUpdateSchema>;

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
});

export const contactUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

export const pipelineStageCreateSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().min(0),
  color: hexColorSchema.optional(),
});

export type PipelineStageCreateInput = z.infer<
  typeof pipelineStageCreateSchema
>;
