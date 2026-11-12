import { fetchSunsetMs } from '@/lib/daylight';
import { isoOf } from '@/lib/nudge/time';

const RETRY_MS = 10 * 60_000;
const entries = new Map<string, { ms?: number; at: number }>();
/** Sunset moves little over a few kilometres: one lookup per day per tenth of a degree. */
const key = (lat: number, lng: number, now: number) => `${isoOf(now)}:${lat.toFixed(1)}:${lng.toFixed(1)}`;

/** Today's sunset if already looked up. */
export const cachedSunset = (lat: number, lng: number, now: number): number | undefined => entries.get(key(lat, lng, now))?.ms;

/** Looks it up once a day for this area (a failed lookup is retried after 10 minutes). Resolves true when a new answer arrived. */
export async function loadSunset(lat: number, lng: number, now: number, fetcher: typeof fetchSunsetMs = fetchSunsetMs): Promise<boolean> {
  const k = key(lat, lng, now);
  const e = entries.get(k);
  if (e && (e.ms !== undefined || now - e.at < RETRY_MS)) return false;
  entries.set(k, { at: now });
  const ms = await fetcher(lat, lng);
  entries.set(k, { ms, at: now });
  return ms !== undefined;
}
