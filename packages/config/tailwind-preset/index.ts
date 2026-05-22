/*
 * LEGACY — Tailwind v3 preset object. NOT used by the build.
 *
 * The preset is now ported to the Tailwind v4 CSS-first API: see `theme.css`,
 * imported by apps/web/app/globals.css via `@import "@modulo/tailwind-preset/theme"`.
 * This file is kept temporarily for reference and will be removed once the v4
 * wiring is fully validated.
 */
import type { Config } from "tailwindcss";

const preset = {
  content: [
    "../../../apps/**/{app,components,pages,src}/**/*.{ts,tsx,mdx}",
    "../../../packages/**/src/**/*.{ts,tsx}",
    "../../../modules/**/{components,pages,src}/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;
