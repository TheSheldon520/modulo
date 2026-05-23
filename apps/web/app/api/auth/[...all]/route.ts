// apps/web/app/api/auth/[...all]/route.ts
//
// Catch-all Better Auth handler. We export the five HTTP verbs exposed by
// `toNextJsHandler` (GET / POST / PATCH / PUT / DELETE) to stay future-proof
// against BA plugins that add new endpoints.

import { auth } from "@modulo/auth";
import { toNextJsHandler } from "@modulo/auth/next";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
