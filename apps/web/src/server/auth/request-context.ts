import { createHash } from "node:crypto";

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/** The origin used in links we email: the configured site in production, the request host while developing. */
export function getRequestOrigin(i: { production: boolean; siteUrl: string; host: string | null | undefined; proto: string | null | undefined }): string {
  if (i.production) return i.siteUrl;
  if (!i.host || !HOST.test(i.host)) return i.siteUrl;
  return `${i.proto === "https" ? "https" : "http"}://${i.host}`;
}

/**
 * The caller's address, from the most trustworthy source available: a header set by the hosting platform, then
 * x-real-ip, then the LAST x-forwarded-for entry (the nearest proxy appends the real client there; earlier entries
 * can be forged by the caller). "unknown" means no usable address.
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const platform = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (platform) return platform;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((p) => p.trim()).filter(Boolean).at(-1);
  return forwarded || "unknown";
}

/** Network addresses are stored only as a hash. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`ip:${ip}`).digest("hex");
}
