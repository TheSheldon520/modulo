// apps/web/global.d.ts
//
// Augments next-intl's `AppConfig.Messages` interface so that `useTranslations`
// / `getTranslations` autocomplete and type-check against the actual catalog.
// We base the type on `messages/fr.json` because:
//   - it is the de-facto source of truth (T0.6.5 hardcoded `fr` as the active
//     locale, EN is mirror-only);
//   - the `i18n-parity` test (lib/i18n-parity.test.ts) guarantees both
//     catalogs share the same set of leaf paths, so typing on FR is
//     equivalent to typing on EN — we just can't pick both.
//
// Augmentation target: `"next-intl"`. Although `interface AppConfig` is
// originally declared in `use-intl/core`, next-intl 4.x re-exports it through
// its public barrel, and TypeScript module augmentations on `"next-intl"`
// fuse with that re-export — confirmed empirically: a `t("invalid.key")` call
// is rejected by tsc with a `NamespacedMessageKeys<...>` error against the
// FR catalog shape. Do not change to `"use-intl"` (not a direct dep of this
// app, would fail to resolve).

import type frMessages from "./messages/fr.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof frMessages;
  }
}
