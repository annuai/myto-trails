/**
 * Removes personal data from a crash report before it leaves the device or server. A rider's position and contacts must never
 * reach a third party, so the report keeps the error type, message, stack and release, and drops everything that could name a
 * person or a place. Used by the phone and the site; the event shape is Sentry's, typed loosely so no SDK is needed here.
 */
type Json = Record<string, unknown>;

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const BEARER = /\b(Bearer|Basic)\s+[\w.~+/=-]{8,}/gi;
/** Two decimals-with-fraction numbers next to each other: a latitude and longitude pair such as "12.9716, 77.5946". */
const COORDINATES = /-?\d{1,3}\.\d{3,}\s*[,;/ ]\s*-?\d{1,3}\.\d{3,}/g;
/** Token-like values in a URL query: ?token=..., &key=..., &code=.... */
const SECRET_PARAM = /([?&](?:token|key|code|secret|password|sig|signature|jwt)=)[^&\s]+/gi;

/** Replaces emails, bearer tokens, coordinate pairs and secret query values in one string. */
export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(BEARER, "$1 [token]").replace(COORDINATES, "[location]").replace(SECRET_PARAM, "$1[removed]");
}

const scrubStrings = (value: unknown): unknown => {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubStrings);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubStrings(v)]));
  return value;
};

/** Returns the event with personal data removed, never the original (callers may keep a reference to it). */
export function scrubCrashEvent<T extends Json>(event: T): T {
  const out: Json = { ...event };
  // Who and where: never sent.
  delete out.user;
  delete out.extra;
  delete out.contexts_location;
  if (out.request && typeof out.request === "object") {
    const { url, method } = out.request as Json;
    out.request = { ...(typeof url === "string" ? { url: scrubText(url.split("?")[0] ?? "") } : {}), ...(typeof method === "string" ? { method } : {}) };
  }
  // Breadcrumbs keep what happened ("tapped Finish") but not the data attached to it (a URL, a position, a response body).
  if (Array.isArray(out.breadcrumbs)) {
    out.breadcrumbs = out.breadcrumbs.map((b) => {
      const { data: _data, ...rest } = b as Json;
      return scrubStrings(rest);
    });
  }
  if (out.exception) out.exception = scrubStrings(out.exception);
  if (typeof out.message === "string") out.message = scrubText(out.message);
  if (out.logentry) out.logentry = scrubStrings(out.logentry);
  return out as T;
}
