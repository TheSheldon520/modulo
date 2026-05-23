import tseslint from "typescript-eslint";
import baseConfig from "@modulo/eslint-config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ["dist/**", ".turbo/**"],
  },
  {
    // Build/config files live outside the TS project graph, so the
    // type-aware parser service cannot resolve them. Disable type-checked
    // linting for these files only — source code stays type-checked.
    ...tseslint.configs.disableTypeChecked,
    files: ["*.{js,mjs,cjs}"],
  },
];
