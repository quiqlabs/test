import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone builds
  output: "standalone",
};

export default nextConfig;
