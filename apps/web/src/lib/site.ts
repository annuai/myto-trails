type SiteEnv = { SITE_URL?: string; NODE_ENV?: string; VERCEL_ENV?: string; VERCEL_URL?: string };

export function getSiteUrl(env: SiteEnv): string {
  const raw = env.SITE_URL?.trim() || (env.VERCEL_URL && env.VERCEL_ENV !== "production" ? `https://${env.VERCEL_URL.trim()}` : undefined);
  if (!raw) {
    if (env.NODE_ENV === "production") throw new Error("SITE_URL must be set in production");
    return "http://localhost:3000";
  }
  if (env.NODE_ENV === "production" && !raw.startsWith("https://")) {
    throw new Error("SITE_URL must use https in production");
  }
  return raw.replace(/\/+$/, "");
}

/** Where to get the phone app (a TestFlight or App Store page), shown on the group invite page. Optional: none until the app is listed. */
export function getAppDownloadUrl(env: Record<string, string | undefined>): string | undefined {
  const raw = env.APP_DOWNLOAD_URL?.trim();
  if (!raw) return undefined;
  try { return new URL(raw).protocol === "https:" ? raw : undefined; } catch { return undefined; }
}
