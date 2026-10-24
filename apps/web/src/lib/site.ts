type SiteEnv = { SITE_URL?: string; NODE_ENV?: string; VERCEL_URL?: string };

export function getSiteUrl(env: SiteEnv): string {
  const raw = env.SITE_URL?.trim() || (env.VERCEL_URL ? `https://${env.VERCEL_URL.trim()}` : undefined);
  if (!raw) {
    if (env.NODE_ENV === "production") throw new Error("SITE_URL must be set in production");
    return "http://localhost:3000";
  }
  if (env.NODE_ENV === "production" && !raw.startsWith("https://")) {
    throw new Error("SITE_URL must use https in production");
  }
  return raw.replace(/\/+$/, "");
}
