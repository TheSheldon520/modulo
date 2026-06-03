import js from "@eslint/js";
import jsoncPlugin from "eslint-plugin-jsonc";
import jsoncParser from "jsonc-eslint-parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ...reactPlugin.configs.flat.recommended,
    files: ["**/*.{jsx,tsx}"],
  },
  {
    ...reactPlugin.configs.flat["jsx-runtime"],
    files: ["**/*.{jsx,tsx}"],
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      "react/prop-types": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  // Lint message catalogs (i18n) for duplicate keys. We pin
  // `eslint-plugin-jsonc@2.21.1` rather than the 3.x line because:
  //  - 2.x advertises `peerDependencies: { eslint: ">=6.0.0" }` and tracks
  //    eslint 9.17.0 explicitly in its CI matrix (we ship eslint 9.17.0).
  //  - 3.x bumped `jsonc-eslint-parser` to v3 and removed the legacy
  //    `.configs.base` shape; staying on 2.21.1 keeps our flat-config
  //    integration surgical and avoids a transitive parser churn.
  // We only enable `jsonc/no-dupe-keys` — anything beyond duplicate detection
  // (sort-keys, indent, …) is out of scope here.
  // The override block first turns off the type-checked TS rules (which the
  // `recommendedTypeChecked` preset enables for every file) before swapping
  // the parser to `jsonc-eslint-parser`; otherwise rules like
  // `@typescript-eslint/await-thenable` blow up on JSON ASTs.
  {
    ...tseslint.configs.disableTypeChecked,
    files: ["**/messages/*.json"],
  },
  {
    files: ["**/messages/*.json"],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc: jsoncPlugin,
    },
    rules: {
      // The base config adds `consistent-type-imports` globally; it requires
      // type-services that are not available with `jsonc-eslint-parser`. We
      // turn it off here in addition to `disableTypeChecked` above.
      "@typescript-eslint/consistent-type-imports": "off",
      "jsonc/no-dupe-keys": "error",
    },
  },
];
