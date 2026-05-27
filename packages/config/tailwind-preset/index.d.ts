// @modulo/tailwind-preset — type declarations
//
// This package ships a single CSS entrypoint (`./theme`) consumed via
// `@import "@modulo/tailwind-preset/theme"` from app stylesheets. There is no
// runtime JS / TS surface — the previous v3 preset object was removed in T0.10
// once the v4 CSS-first wiring was validated.
//
// This file exists solely so `tsc --noEmit` has at least one input to type and
// so future TS consumers that try to `import "@modulo/tailwind-preset/theme"`
// (e.g. for side-effect CSS imports under `moduleResolution: "bundler"`) get a
// well-typed `unknown` module rather than a "cannot find module" error.

declare module "@modulo/tailwind-preset/theme";
