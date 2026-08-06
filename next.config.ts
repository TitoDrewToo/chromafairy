import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin", destination: "/studio", permanent: true },
      { source: "/admin/:path*", destination: "/studio/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
