# @modulo/sales-analytics

**Status**: scaffolded (T1.2) — not yet wired into the root tRPC router.

The "Sales Analytics" module. Scaffolded with `pnpm module:new sales-analytics`.

## Layout

| File | Purpose |
|------|---------|
| `module.config.ts` | Module-local metadata (icon, scopes, Stripe price getter). |
| `schema.ts` | Drizzle tables. Re-exported from `packages/db/schema/index.ts`. |
| `router.ts` | tRPC router. Mounted in `packages/api/src/router.ts` (T1.3+). |
| `__tests__/` | Vitest smoke tests. |

## Invariants

- Every table carries `organization_id` (indexed, FK CASCADE) — multi-tenant safety.
- Every procedure starts from `moduleProcedure("sales-analytics")` — module-enablement gate.
- No import from another `modules/*` package — inter-module comms via events or public routers only.

## Next steps after scaffold

1. Customise `module.config.ts` (icon, scopes, price label).
2. Replace the example table in `schema.ts` with real tables.
3. Re-export from `packages/db/schema/index.ts`:
   ```ts
   export * from "../../../modules/sales-analytics/schema";
   ```
4. Generate migration: `pnpm db:generate --name=sales_analytics_init`.
5. Apply migration: `pnpm db:migrate`.
6. Wire the router into `packages/api/src/router.ts` (T1.3+).
