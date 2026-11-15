/**
 * Product analytics shared by the website and the app: the only events and props that may be sent, and the functions that make
 * every one of them anonymous before it leaves the device. Nothing here knows about PostHog; each app's client calls these.
 * No coordinates, routes, ride ids, emails, names or free text, ever (docs/11-security-and-moderation.md).
 */

type Kind = "slug" | "km" | "min" | readonly string[];

/** Every event and the props it may carry. A prop not listed here is dropped. */
export const ANALYTICS_EVENTS = {
  app_opened: {},
  screen_viewed: { screen: "slug" },
  ride_started: { source: ["gps", "sim"] },
  ride_finished: { distanceKm: "km", durationMin: "min" },
  trail_viewed: { trail: "slug" },
  fix_it_opened: { guide: "slug" },
  offline_region_downloaded: { region: "slug" },
  sign_in_completed: {},
  app_download_clicked: { store: ["ios", "android"] },
} as const satisfies Record<string, Record<string, Kind>>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsProps = Record<string, string | number>;

/** A public slug or route pattern: letters, digits, hyphens, underscores, slashes and brackets, at most 80 characters. No spaces, @, dots or commas. */
const SAFE = /^[a-z0-9/[\]][a-z0-9_/[\]-]{0,79}$/i;

/** Keeps only the props listed for `name`, rounds numbers (distance to 1 km, duration to 5 minutes) and drops anything else. */
export function scrubAnalyticsProps(name: AnalyticsEventName, props: Record<string, unknown> = {}): AnalyticsProps {
  const allowed: Record<string, Kind> = ANALYTICS_EVENTS[name];
  const out: AnalyticsProps = {};
  for (const [key, kind] of Object.entries(allowed)) {
    const v = props[key];
    if (kind === "km" || kind === "min") {
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      out[key] = kind === "km" ? Math.round(v) : Math.round(v / 5) * 5;
    } else if (kind === "slug") {
      if (typeof v === "string" && SAFE.test(v)) out[key] = v;
    } else if (typeof v === "string" && kind.includes(v)) out[key] = v;
  }
  return out;
}

/** Website paths whose later segments are public content (trail and region slugs) and may be sent as they are. */
const PUBLIC_PREFIXES = new Set(["trails", "regions", "countries"]);
/** Fixed words in the website's routes. Under any other prefix, a segment not in this list is an id and becomes `[id]`. */
const STATIC_WORDS = new Set([
  "about", "account", "app", "auth", "check-email", "club", "comments", "confirm", "contributions", "countries", "delete", "deleted", "design",
  "devices", "donate", "done", "download", "due", "event", "join", "moderate", "privacy", "questions", "regions", "report", "reports",
  "responsible-riding", "riders", "route", "saved", "sign-in", "submit", "terms", "track", "trails", "users", "welcome",
]);
const PUBLIC_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** A website path as a route pattern: `/track/abc?x=1` becomes `/track/[id]`; public trail and region slugs are kept. */
export function webPagePattern(pathname: string): string {
  const segs = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  const pub = PUBLIC_PREFIXES.has(segs[0] ?? "");
  return "/" + segs.map((s) => (STATIC_WORDS.has(s) || (pub && PUBLIC_SLUG.test(s)) ? s : "[id]")).join("/");
}

/** An app screen as a route pattern, from expo-router's segments: route groups like `(tabs)` are left out and a filled-in id becomes `[id]`. */
export function screenPattern(segments: readonly string[]): string {
  const segs = segments.filter((s) => !/^\(.*\)$/.test(s)).map((s) => (/^\[.+\]$/.test(s) || /^[a-z][a-z-]*$/.test(s) ? s : "[id]"));
  return "/" + segs.join("/");
}

/** Website pages that are never recorded by session replay: accounts, sign-in, moderation, private links and contributions. */
export const REPLAY_BLOCKED_PREFIXES = ["account", "sign-in", "auth", "moderate", "track", "route", "join", "submit", "saved"] as const;

export function replayAllowed(pathname: string): boolean {
  const first = pathname.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? "";
  return !(REPLAY_BLOCKED_PREFIXES as readonly string[]).includes(first);
}
