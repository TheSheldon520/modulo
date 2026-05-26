// packages/api/src/routers/organizations.ts
//
// Organizations sub-router. T0.8 only exposes `create` — used by the
// onboarding flow after sign-up. Listing / switching / renaming come in T0.9
// (settings) and T1.X (multi-org users).
//
// `create` is atomic: the organization row and the owner membership are
// inserted in a single transaction. The active-org cookie is then emitted on
// `ctx.resHeaders` so the very next request lands inside the freshly created
// org without a round-trip to `whoami`.

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { memberships, organizations } from "@modulo/db/schema";

import { authedProcedure } from "../procedures";
import { buildActiveOrgCookie, router } from "../trpc";

/**
 * Mirror of `apps/web/lib/onboarding-schemas.ts#makeCreateOrgSchema`, minus
 * the i18n layer. Server validation is intentionally re-declared (single
 * source of truth on the server) — the client schema only owns localized
 * error messages.
 */
const createInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug is too short")
    .max(50, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
});

/**
 * Narrow `unknown` to "looks like a PG error with a `code` string". Avoids
 * importing `NeonDbError` (the Pool driver throws an instance of the `pg`
 * `DatabaseError` class, not `NeonDbError` — both expose the same `code`).
 */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

export const organizationsRouter = router({
  create: authedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.transaction(async (tx) => {
          const [org] = await tx
            .insert(organizations)
            .values({ name: input.name, slug: input.slug })
            .returning({
              id: organizations.id,
              name: organizations.name,
              slug: organizations.slug,
            });
          if (!org) {
            // Defensive — `RETURNING` on a single insert always yields a row
            // or throws. Surface as a server error rather than silently
            // returning undefined.
            throw new Error("Insert organization returned no row");
          }

          await tx.insert(memberships).values({
            userId: ctx.user.id,
            organizationId: org.id,
            role: "owner",
          });

          return org;
        });

        // Set the active-org cookie immediately so the next request resolves
        // the new org without falling back to the "oldest membership" heuristic.
        ctx.resHeaders.append("Set-Cookie", buildActiveOrgCookie(result.id));

        return result;
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Slug already taken",
          });
        }
        throw err;
      }
    }),
});
