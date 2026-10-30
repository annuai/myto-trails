/** The visitor's country as an upper-case ISO code, from the hosting platform's geolocation header. Null when it is absent or malformed. */
export function detectCountry(h: { get(name: string): string | null }): string | null {
  const code = h.get("x-vercel-ip-country");
  return code && /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : null;
}

export const COUNTRY_COOKIE = "mt_country";
const ISO = /^[A-Z]{2}$/;

/** A country the visitor chose, as stored in the cookie. */
export const parseCountryCookie = (v: string | undefined | null): string | null => (v && ISO.test(v.toUpperCase()) && v.length === 2 ? v.toUpperCase() : null);

export type BrowsingCountry = {
  /** The country to filter lists by; null shows every open country. */
  iso2: string | null;
  source: "chosen" | "detected" | "none";
  /** Set when the visitor appears to be in a country we are not open in yet. */
  notOpenYet: string | null;
};

/**
 * Which country a visitor is browsing. A choice they made wins; otherwise their detected country if it is open;
 * otherwise everything open. Detection is a default, never a gate.
 */
export function resolveBrowsingCountry(i: { cookie: string | null; detected: string | null; open: ReadonlySet<string> }): BrowsingCountry {
  if (i.cookie && i.open.has(i.cookie)) return { iso2: i.cookie, source: "chosen", notOpenYet: null };
  if (i.detected && i.open.has(i.detected)) return { iso2: i.detected, source: "detected", notOpenYet: null };
  return { iso2: null, source: "none", notOpenYet: i.detected && !i.open.has(i.detected) ? i.detected : null };
}
