import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["heic-convert"],
  outputFileTracingIncludes: {
    "/**": ["./docs/System_Journal.md"],
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/studio", permanent: true },
      { source: "/admin/:path*", destination: "/studio/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
