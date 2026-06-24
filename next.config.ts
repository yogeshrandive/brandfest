import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native binaries outside the bundle so Node loads them at runtime
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
};

export default nextConfig;
