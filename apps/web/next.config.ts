import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Core ships TypeScript source.
  transpilePackages: ["@ask-sikhi/core"],
};

export default config;
