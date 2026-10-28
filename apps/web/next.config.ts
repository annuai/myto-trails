import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Development only: other devices on the wifi (a phone testing the app) may load dev resources from this server.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
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
      // Pages that are the key to a rider's check-in or a shared route must never sit in a shared cache.
      { source: "/track/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/route/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
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
