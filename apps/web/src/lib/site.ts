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

/** The Android beta build: an https link to the APK (kept on object storage), with the version and size to show beside it. Nothing until the link is set. */
export function getBetaApk(env: Record<string, string | undefined>): { url: string; version: string; size: string } | undefined {
  const raw = env.APP_BETA_APK_URL?.trim();
  if (!raw) return undefined;
  try {
    if (new URL(raw).protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }
  return { url: raw, version: env.APP_BETA_VERSION?.trim() || "0.10", size: env.APP_BETA_SIZE?.trim() || "60 MB" };
}

/** Where the app mailing list lives: the myto-moto.com signup endpoint. https, or http on this machine for development. */
export function getWaitlistUrl(env: Record<string, string | undefined>): string | undefined {
  const raw = env.MYTO_WAITLIST_URL?.trim();
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    const local = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    return u.protocol === "https:" || local ? raw : undefined;
  } catch {
    return undefined;
  }
}
