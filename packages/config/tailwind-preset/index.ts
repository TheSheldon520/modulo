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
