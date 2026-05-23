// packages/api/src/procedures.ts
//
// The four procedure primitives that every module router builds upon.
//
//   publicProcedure   — no auth (marketing, healthcheck)
//   authedProcedure   — requires an authenticated user
//   orgProcedure      — requires an authenticated user with an active org
//   moduleProcedure   — requires the active org to have a given module enabled
//
// Each step narrows the context type so downstream handlers don't need to
// re-check nullability.

import { TRPCError } from "@trpc/server";

import { publicProcedure } from "./trpc";

/**
 * Authenticated user. Narrows `ctx.user` and `ctx.session` to non-null.
 */
export const authedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

/**
 * Authenticated user inside an active organization. Narrows `ctx.activeOrg`
 * to non-null.
 */
export const orgProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!ctx.activeOrg) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active organization",
    });
  }
  return next({
    ctx: {
      ...ctx,
      activeOrg: ctx.activeOrg,
    },
  });
});

/**
 * Factory: returns a procedure that requires the active organization to have
 * `moduleId` enabled. The single place where the "module-not-enabled → 403"
 * check lives — every module router MUST start from this builder.
 */
export const moduleProcedure = (moduleId: string) =>
  orgProcedure.use(({ ctx, next }) => {
    if (!ctx.enabledModules.includes(moduleId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Module "${moduleId}" not enabled for this organization`,
      });
    }
    return next();
  });

export { publicProcedure };
