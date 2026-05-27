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
//
// `getAuth()` is the lazy factory exported by `@modulo/auth`. The BA instance
// (and thus the verb handlers) is built on first invocation and cached at
// module scope on this route only — first request pays the build cost,
// subsequent requests reuse the cache. This is NOT the eager pattern that
// pre-T0.10 forced env vars to be set at import time: nothing happens here
// at module load, BA env vars are only read on the first hit.

import { getAuth } from "@modulo/auth";
import { toNextJsHandler } from "@modulo/auth/next";

type Verb = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Handler = (req: Request) => Promise<Response>;
type Handlers = Record<Verb, Handler>;

let cachedHandlers: Handlers | undefined;

function getHandlers(): Handlers {
  if (!cachedHandlers) {
    cachedHandlers = toNextJsHandler(getAuth());
  }
  return cachedHandlers;
}

const CLEAR_ACTIVE_ORG_COOKIE =
  "modulo-active-org=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

function wrap(verb: Verb) {
  return async (req: Request): Promise<Response> => {
    const response = await getHandlers()[verb](req);
    if (new URL(req.url).pathname.endsWith("/sign-out")) {
      response.headers.append("Set-Cookie", CLEAR_ACTIVE_ORG_COOKIE);
    }
    return response;
  };
}

export const GET = wrap("GET");
export const POST = wrap("POST");
export const PATCH = wrap("PATCH");
export const PUT = wrap("PUT");
export const DELETE = wrap("DELETE");
