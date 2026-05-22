import type { NextConfig } from "next";

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

export default nextConfig;
