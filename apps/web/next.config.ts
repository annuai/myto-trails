import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@moto-trails/domain"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          dev,
          production: !dev,
          mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
          publicAssetBase: process.env.R2_PUBLIC_BASE_URL,
        }),
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
