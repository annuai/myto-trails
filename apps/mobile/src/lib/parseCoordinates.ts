import type { LatLng } from '@/lib/geo';

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;
const inRange = (lat: number, lng: number): LatLng | undefined => (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined);
const pair = (a: string, b: string) => inRange(parseFloat(a), parseFloat(b));

/** One degrees-minutes-seconds half, "12°58'18.0\"N": degrees, optional minutes and seconds, then the hemisphere letter. */
const DMS = String.raw`(\d{1,3})\s*°\s*(?:(\d{1,2})\s*['′]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|'')\s*)?([NSEW])`;
const sign = (h: string) => (h === 'S' || h === 'W' ? -1 : 1);
const dms = (d: string, m: string | undefined, s: string | undefined, h: string) => sign(h) * (Number(d) + Number(m ?? 0) / 60 + Number(s ?? 0) / 3600);

/**
 * A spot pasted from Google Maps: "12.9716, 77.5946" (what long-press copies), degrees-minutes-seconds ("12°58'18.0"N 77°35'40.6"E"),
 * decimal degrees with N/S/E/W, or a full maps link (the pin `!3d…!4d…`, else `@lat,lng`, else `?q=lat,lng`). `undefined` when the text is anything else,
 * so a place name or a postcode still goes to the search. Short links (maps.app.goo.gl) hold no coordinates and cannot be read offline.
 */
export function parseCoordinates(text: string): LatLng | undefined {
  const t = text.trim().replace(/[()[\]]/g, '').replace(/\s+/g, ' ');
  if (!t) return undefined;
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(t);
  if (pin) return pair(pin[1], pin[2]);
  if (/^https?:\/\//i.test(t)) {
    const at = new RegExp(`@(${NUM}),(${NUM})`).exec(t) ?? new RegExp(`[?&](?:q|ll|query|destination)=(${NUM}),\\s*(${NUM})`).exec(t);
    return at ? pair(at[1], at[2]) : undefined;
  }
  const d = new RegExp(`^${DMS}[ ,]*${DMS}$`, 'i').exec(t.toUpperCase());
  if (d) {
    const a = dms(d[1], d[2], d[3], d[4]); const b = dms(d[5], d[6], d[7], d[8]);
    // Latitude is the N/S half; accept either order.
    return /[NS]/.test(d[4]) ? inRange(a, b) : inRange(b, a);
  }
  const letters = new RegExp(`^(${NUM})\\s*°?\\s*([NS]),?\\s*(${NUM})\\s*°?\\s*([EW])$`, 'i').exec(t);
  if (letters) return inRange(sign(letters[2].toUpperCase()) * Math.abs(parseFloat(letters[1])), sign(letters[4].toUpperCase()) * Math.abs(parseFloat(letters[3])));
  const plain = new RegExp(`^(${NUM})\\s*[, ]\\s*(${NUM})$`).exec(t);
  return plain ? pair(plain[1], plain[2]) : undefined;
}
