// packages/db/schema/index.ts
// Barrel — re-exports every table, enum and inferred type of the schema.
//
// Module schemas are re-exported here so `drizzle-kit generate` discovers
// them via the single `schema` entry in `drizzle.config.ts`. Each module
// owns its own tables file under `modules/<id>/schema.ts`; this barrel
// keeps the migration tool blind to the module/package boundary.
export * from "./core";
export * from "./billing";
export * from "./auth";

// Module schemas — keep grouped at the bottom, one line per module.
export * from "../../../modules/sales-analytics/schema";
