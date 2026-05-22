import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import baseConfig from "@modulo/eslint-config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    // Build/config files live outside the TS project graph, so the
    // type-aware parser service cannot resolve them. Disable type-checked
    // linting for these files only — application code stays type-checked.
    ...tseslint.configs.disableTypeChecked,
    files: ["*.{js,mjs,cjs}"],
  },
];
