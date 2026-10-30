import { PLAN_KMH } from './routePlan';
import { forecastUrl, parseForecast } from './weather';
import { deviceLocale } from './locale';

/** Be off the road this long before the sun goes down. */
export const DARK_BUFFER_MIN = 30;
/** The alert while riding comes this long before sunset. */
export const ALERT_BEFORE_MIN = 45;
const MIN = 60_000;

export type DaylightAdvice = {
  sunsetMs: number;
  /** About how long the ride takes at a steady pace. */
  rideMs: number;
  /** When it would end if it started at `now`. */
  endIfNowMs: number;
  /** Kilometres of it after sunset if it started at `now` (0 when it ends before dark). */
  darkKm: number;
  /** The latest start that still ends `DARK_BUFFER_MIN` before sunset; before `now` when it is too late today. */
  latestStartMs: number;
};

/** How a route of `distanceKm` sits against sunset, riding at an average `kmh` (a rough steady pace, not a promise). */
export function daylightAdvice(i: { distanceKm: number; sunsetMs: number; now: number; kmh?: number }): DaylightAdvice {
  const kmh = i.kmh ?? PLAN_KMH;
  const rideMs = (i.distanceKm / kmh) * 3_600_000;
  const endIfNowMs = i.now + rideMs;
  const darkKm = Math.max(0, Math.min(i.distanceKm, ((endIfNowMs - i.sunsetMs) / 3_600_000) * kmh));
  return { sunsetMs: i.sunsetMs, rideMs, endIfNowMs, darkKm: +darkKm.toFixed(1), latestStartMs: i.sunsetMs - DARK_BUFFER_MIN * MIN - rideMs };
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString(deviceLocale(), { hour: 'numeric', minute: '2-digit' });

/** One or two plain sentences for the planning card. */
export function daylightText(a: DaylightAdvice, now: number): string {
  if (now >= a.sunsetMs) return `The sun has set (${clock(a.sunsetMs)}). Riding now is in the dark.`;
  if (a.darkKm <= 0) return `Sunset is at ${clock(a.sunsetMs)}. Starting now you would finish around ${clock(a.endIfNowMs)}, before dark.`;
  // Part of it after dark means starting now is too late. The time of day to leave by holds for tomorrow too.
  return `Sunset is at ${clock(a.sunsetMs)}. Starting now, about ${Math.round(a.darkKm)} km is after dark. To finish before dark, leave by ${clock(a.latestStartMs)}${a.latestStartMs <= now ? ' tomorrow' : ''}.`;
}

/** Time for the ride alert: inside the 45 minutes before sunset, and not yet told for this ride. */
export const daylightAlertDue = (now: number, sunsetMs: number, alreadyTold: boolean): boolean => !alreadyTold && now >= sunsetMs - ALERT_BEFORE_MIN * MIN && now < sunsetMs;

/** Today's sunset where the rider is, from Open-Meteo (no key). Undefined when there is no answer or no signal. */
export async function fetchSunsetMs(lat: number, lng: number, fetcher: typeof fetch = fetch): Promise<number | undefined> {
  try {
    const res = await fetcher(forecastUrl(lat, lng, 1));
    if (!res.ok) return undefined;
    return parseForecast(await res.json())[0]?.sunsetMs;
  } catch { return undefined; }
}

export const sunsetClock = clock;
