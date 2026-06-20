import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: ['@minigraf/browser'],
};

export default nextConfig;
