/**
 * Sunrise and sunset worked out on the phone, with no network: the usual solar equations (as in NOAA's tables), good to about a
 * minute away from the poles. Alarms ring before dawn, often without signal, so they cannot wait for a weather answer.
 */
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const RAD = Math.PI / 180;
/** The sun's centre this far below the horizon counts as rise and set (refraction and the size of the disc). */
const H0 = -0.833 * RAD;
const OBLIQUITY = 23.4397 * RAD;

export type SunTimes = { sunriseMs: number; sunsetMs: number };

/**
 * When the sun rises and sets on the solar day nearest `at` (pass local midday of the day you want), at `lat`/`lng` in degrees.
 * Undefined when it neither rises nor sets that day (polar day or night).
 */
export function sunTimes(at: number, lat: number, lng: number): SunTimes | undefined {
  const lw = -lng * RAD;
  const phi = lat * RAD;
  const d = at / DAY_MS - 0.5 + J1970 - J2000;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosW = (Math.sin(H0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return undefined;
  const w = Math.acos(cosW);
  const set = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const rise = noon - (set - noon);
  const ms = (j: number) => Math.round((j + 0.5 - J1970) * DAY_MS);
  return { sunriseMs: ms(rise), sunsetMs: ms(set) };
}
