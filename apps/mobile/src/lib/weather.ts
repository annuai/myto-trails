import { speedKmh, withUnit } from './units';
export type DayForecast = { date: string; maxC: number; minC: number; rainMm: number; rainPct: number; windKmh: number; snowCm: number; /** When the sun rises and sets there that day, as instants. Missing when the answer has no times. */ sunriseMs?: number; sunsetMs?: number };
export type Rideability = { level: 'good' | 'caution' | 'avoid'; reasons: string[] };

/** Open-Meteo, which needs no key. `days` is how many days from today (1 to 16). */
export function forecastUrl(lat: number, lng: number, days: number = 7): string {
  const daily = 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,snowfall_sum,sunrise,sunset';
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&daily=${daily}&timezone=auto&forecast_days=${Math.max(1, Math.min(16, Math.round(days)))}`;
}

type Daily = { time?: string[]; temperature_2m_max?: (number | null)[]; temperature_2m_min?: (number | null)[]; precipitation_sum?: (number | null)[]; precipitation_probability_max?: (number | null)[]; wind_speed_10m_max?: (number | null)[]; snowfall_sum?: (number | null)[]; sunrise?: (string | null)[]; sunset?: (string | null)[] };

/** Open-Meteo gives local clock times like 2026-11-01T17:52 and the zone's offset from UTC; this is that instant. */
const instant = (local: string | null | undefined, offsetSec: number): number | undefined => {
  if (!local) return undefined;
  const t = Date.parse(`${local}:00Z`) - offsetSec * 1000;
  return Number.isFinite(t) ? t : undefined;
};

/** One entry per day from an Open-Meteo answer. A missing number is 0 (rain, wind, snow) rather than a guess at a temperature: a day with no temperatures is dropped. */
export function parseForecast(json: unknown): DayForecast[] {
  const d = (json as { daily?: Daily } | null)?.daily;
  const offset = (json as { utc_offset_seconds?: number } | null)?.utc_offset_seconds ?? 0;
  if (!d?.time) return [];
  const out: DayForecast[] = [];
  d.time.forEach((date, i) => {
    const maxC = d.temperature_2m_max?.[i], minC = d.temperature_2m_min?.[i];
    if (typeof maxC !== 'number' || typeof minC !== 'number') return;
    out.push({ date, maxC, minC, rainMm: d.precipitation_sum?.[i] ?? 0, rainPct: d.precipitation_probability_max?.[i] ?? 0, windKmh: d.wind_speed_10m_max?.[i] ?? 0, snowCm: d.snowfall_sum?.[i] ?? 0, ...(instant(d.sunrise?.[i], offset) !== undefined ? { sunriseMs: instant(d.sunrise?.[i], offset) } : {}), ...(instant(d.sunset?.[i], offset) !== undefined ? { sunsetMs: instant(d.sunset?.[i], offset) } : {}) });
  });
  return out;
}

const RANK = { good: 0, caution: 1, avoid: 2 } as const;

/** A short plain-language verdict for one day: the worst of rain, heat, wind and snow or ice. */
export function rideability(day: DayForecast): Rideability {
  let level: Rideability['level'] = 'good';
  const reasons: string[] = [];
  const flag = (l: Rideability['level'], why: string) => { reasons.push(why); if (RANK[l] > RANK[level]) level = l; };
  if (day.rainMm >= 30) flag('avoid', `Heavy rain (${Math.round(day.rainMm)} mm)`);
  else if (day.rainMm >= 10 || day.rainPct >= 70) flag('caution', day.rainMm >= 10 ? `Rain (${Math.round(day.rainMm)} mm)` : `Rain likely (${Math.round(day.rainPct)}%)`);
  if (day.maxC >= 43) flag('avoid', `Extreme heat (${Math.round(day.maxC)}°C)`);
  else if (day.maxC >= 38) flag('caution', `Hot (${Math.round(day.maxC)}°C)`);
  if (day.windKmh >= 60) flag('avoid', `Gale-force wind (${withUnit(speedKmh(day.windKmh))})`);
  else if (day.windKmh >= 40) flag('caution', `Strong wind (${withUnit(speedKmh(day.windKmh))})`);
  if (day.snowCm >= 5) flag('avoid', `Snow (${Math.round(day.snowCm)} cm)`);
  else if (day.snowCm > 0 || day.minC <= 0) flag('caution', 'Snow or ice possible');
  return { level, reasons };
}

/** "Good to ride" or the reasons, for one line under a trail or route. */
export const rideabilityText = (r: Rideability): string => (r.reasons.length ? r.reasons.join(' · ') : 'Good to ride');
