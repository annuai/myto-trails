import { createHash } from "node:crypto";

export type CachePolicy = "day" | "none";

/** Browsers and the app re-ask after 5 minutes; the CDN answers for 23 hours, then serves stale for one hour while it refreshes: 24 hours at the worst. */
export const PUBLIC_DAY_CACHE_CONTROL = "public, max-age=300, s-maxage=82800, stale-while-revalidate=3600";

const strip = (tag: string) => tag.trim().replace(/^W\//, "");

/**
 * Cache headers for one API response. A request that carried a token is private whatever the route says, so the shared
 * cache can only ever hold public, tokenless output. Only a 200 is cached; errors keep the handler's no-store.
 */
export async function applyCachePolicy(res: Response, o: { policy: CachePolicy; authed: boolean; ifNoneMatch: string | null }): Promise<Response> {
  if (o.authed) {
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }
  if (o.policy !== "day" || res.status !== 200) return res;

  const text = await res.text();
  const etag = `W/"${createHash("sha1").update(text).digest("base64url")}"`;
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", PUBLIC_DAY_CACHE_CONTROL);
  headers.set("ETag", etag);
  if (o.ifNoneMatch !== null && o.ifNoneMatch.split(",").some((t) => strip(t) === strip(etag))) {
    headers.delete("Content-Type");
    return new Response(null, { status: 304, headers });
  }
  return new Response(text, { status: 200, headers });
}
