// packages/auth/src/client.ts
//
// Better Auth React client — exported as the `@modulo/auth/client` subpath to
// keep server and client surfaces strictly separate. Re-importing from the
// root entry would drag the Drizzle adapter into the client bundle.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
