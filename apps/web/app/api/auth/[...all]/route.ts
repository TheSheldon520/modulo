// apps/web/app/api/auth/[...all]/route.ts
//
// Catch-all Better Auth handler. We export the five HTTP verbs exposed by
// `toNextJsHandler` (GET / POST / PATCH / PUT / DELETE) to stay future-proof
// against BA plugins that add new endpoints.
//
// Each method is wrapped to clear the `modulo-active-org` cookie on `/sign-out`
// — Better Auth only clears its own session cookies, so without this wrap the
// active-org cookie would survive a logout and pollute the next user's session
// on the same browser (middleware fast-path would false-positive).

import { auth } from "@modulo/auth";
import { toNextJsHandler } from "@modulo/auth/next";

const handlers = toNextJsHandler(auth);

const CLEAR_ACTIVE_ORG_COOKIE =
  "modulo-active-org=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

function wrap(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const response = await handler(req);
    if (new URL(req.url).pathname.endsWith("/sign-out")) {
      response.headers.append("Set-Cookie", CLEAR_ACTIVE_ORG_COOKIE);
    }
    return response;
  };
}

export const GET = wrap(handlers.GET);
export const POST = wrap(handlers.POST);
export const PATCH = wrap(handlers.PATCH);
export const PUT = wrap(handlers.PUT);
export const DELETE = wrap(handlers.DELETE);
