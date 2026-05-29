# @modulo/sales-analytics

The "Sales Analytics" module. Pipeline-aware CRM-lite for B2B sales teams:
deals, contacts, pipeline stages, and a KPI dashboard.

## Status

- **T1.2** — scaffolded (config, schema 3 tables, router shell).
- **T1.3** — CRUD live (deals/contacts/pipelineStages procedures + `/m/sales/deals` UI).
- **T1.4** — overview dashboard (KPIs + revenue chart + stage donut + sidebar sub-items).

## Layout

| File | Purpose |
|------|---------|
| `module.config.ts` | Module-local metadata (icon, scopes, Stripe price, sidebar navigation, role permissions). |
| `schema.ts` | Drizzle tables. Re-exported from `packages/db/schema/index.ts`. |
| `schemas.ts` | Pure-isomorphic Zod schemas + `DEAL_STAGES`. Imported by both the router AND Client Components — **never import schemas from the router barrel client-side** (it transitively pulls `@trpc/server` and crashes the browser at hydration). |
| `router.ts` | tRPC router. Mounted in `packages/api/src/router.ts` under the `salesAnalytics` namespace. |
| `lib/` | Pure helpers (date ranges, KPI math). Testable without React/Next. |
| `__tests__/` | Vitest tests (schemas, helpers). |

## Invariants

- Every table carries `organization_id` (indexed, FK CASCADE) — multi-tenant safety.
- Every procedure starts from `moduleProcedure("sales-analytics")` — module-enablement gate.
- Every mutation reaffirms `eq(table.organizationId, ctx.activeOrg.id)` in its WHERE clause — defence in depth.
- No import from another `modules/*` package — inter-module comms via events or public routers only.
- Client Components import schemas/enums from `@modulo/sales-analytics/schemas`, never from the root barrel.

## Seed (demo data)

The repo ships a one-shot seed for the Silverlit retail dogfooding context:

```bash
# Idempotent: skips if any pipeline stage already exists for the org.
pnpm seed:sales <org-slug>

# Reset: purges the org's sales_deals + sales_contacts + sales_pipeline_stages
# BEFORE re-seeding. Useful to wipe ad-hoc rows created during testing.
pnpm seed:sales <org-slug> --reset
```

Inserts 5 pipeline stages, 5 contacts (Carrefour, Leclerc, Picwic, Boulanger,
JouéClub), and 10 deals (4 won, 2 lost, 4 open) with dates spread across the
last 12 months — so the T1.4 dashboard renders populated charts.

## Stripe Price

Activation is gated by the `STRIPE_PRICE_SALES_ANALYTICS` env var (resolved
lazily inside `module.config.ts`). The actual Stripe Price must be created
manually in the Stripe dashboard before checkout in non-test environments —
the registry entry stays valid even when the env var is unset (lazy `requireEnv`).
