/**
 * "Bengaluru, India" from the hosting platform's geolocation headers (Vercel sets x-vercel-ip-city and
 * x-vercel-ip-country). Returns null when the platform does not provide them, for example on a laptop.
 */
export function placeFromHeaders(h: { get(name: string): string | null }): string | null {
  const rawCity = h.get("x-vercel-ip-city");
  const code = h.get("x-vercel-ip-country");
  let city = "";
  try {
    city = rawCity ? decodeURIComponent(rawCity).trim().slice(0, 60) : "";
  } catch {
    city = "";
  }
  let country = "";
  if (code && /^[A-Za-z]{2}$/.test(code)) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? "";
    } catch {
      country = "";
    }
  }
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}
