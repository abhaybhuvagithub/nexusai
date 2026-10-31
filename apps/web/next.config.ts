import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/nexusai",
  images: { unoptimized: true },
};

export default nextConfig;
