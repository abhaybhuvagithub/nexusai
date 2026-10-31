import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  ...(process.env.GITHUB_PAGES === "true" ? { basePath: "/nexusai" } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
