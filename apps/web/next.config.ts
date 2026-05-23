import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl plugin: wires the request config at `apps/web/i18n/request.ts`
// (the default path) into the Next.js build. T0.6.5 ships with a single,
// hardcoded locale — no URL routing, no middleware, no locale switcher.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `@modulo/ui` ships raw .tsx (no build step) so Next must transpile it.
  transpilePackages: ["@modulo/ui"],
  // Lint and type errors are gated by the monorepo `pnpm lint` / `pnpm typecheck`
  // tasks, so Next's own build-time checks are disabled to avoid duplicate work.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
