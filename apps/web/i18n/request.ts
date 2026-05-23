// apps/web/i18n/request.ts
//
// next-intl request config. T0.6.5 ships a single, hardcoded locale ("fr") —
// no URL-segment routing, no locale switcher, no next-intl middleware. The
// dynamic import keeps message catalogs out of every bundle and makes adding
// a real locale picker (later) a one-line change here.
//
// JSON imports are typed as `Record<string, unknown>` because TS can't infer
// the shape of a dynamically-imported JSON module — `unknown` keeps us strict
// without disabling the rule (no `any` per CLAUDE.md §TS). next-intl validates
// the structure at runtime.

import { getRequestConfig } from "next-intl/server";

interface MessagesModule {
  default: Record<string, unknown>;
}

export default getRequestConfig(async () => {
  const locale = "fr";
  const mod = (await import(`../messages/${locale}.json`)) as MessagesModule;

  return {
    locale,
    messages: mod.default,
  };
});
