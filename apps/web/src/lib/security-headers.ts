type Options = { dev: boolean; mapStyleUrl?: string; publicAssetBase?: string };

const OSM_TILES = "https://tile.openstreetmap.org";

const origin = (u?: string): string | null => {
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
};

/**
 * Content Security Policy. Next.js inlines small scripts and styles, so 'unsafe-inline' stays for those; everything
 * else is limited to our own origin, the configured map style host and public image host.
 */
export function buildCsp(o: Options): string {
  const mapHost = origin(o.mapStyleUrl);
  const demo = "https://demotiles.maplibre.org";
  const assets = origin(o.publicAssetBase);
  const connect = ["'self'", mapHost ?? demo, OSM_TILES, ...(assets ? [assets] : [])];
  const img = ["'self'", "data:", "blob:", OSM_TILES, ...(mapHost ? [mapHost] : []), ...(assets ? [assets] : [])];
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${o.dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}${o.dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function securityHeaders(o: Options & { production: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildCsp(o) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
    ...(o.production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
  ];
}
