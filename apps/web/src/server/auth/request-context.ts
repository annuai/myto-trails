import { createHash } from "node:crypto";

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/** The origin used in links we email: the configured site in production, the request host while developing. */
export function getRequestOrigin(i: { production: boolean; siteUrl: string; host: string | null | undefined; proto: string | null | undefined }): string {
  if (i.production) return i.siteUrl;
  if (!i.host || !HOST.test(i.host)) return i.siteUrl;
  return `${i.proto === "https" ? "https" : "http"}://${i.host}`;
}

export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Network addresses are stored only as a hash. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`ip:${ip}`).digest("hex");
}
