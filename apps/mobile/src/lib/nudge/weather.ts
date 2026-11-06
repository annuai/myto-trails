import type { DayForecast } from './types';

/** A day worth riding: dry, not too hot or cold, and no storm. WMO codes 0 to 3 are clear to overcast; 45 and 48 are fog. */
export const goodRidingDay = (d: DayForecast): boolean => d.code <= 3 && d.rainPct <= 25 && d.tempMax >= 14 && d.tempMax <= 35;
/** A day to keep a cheerful nudge away from: rain likely, or a storm. */
export const badRidingDay = (d: DayForecast): boolean => d.code >= 51 || d.rainPct >= 60;

/** In words: "clear", "partly cloudy", "overcast" for the good days. */
export const skyWord = (code: number): string => (code === 0 ? 'Clear skies' : code <= 2 ? 'Mostly sunny' : 'Cloudy but dry');

/** Open-Meteo's daily answer as forecast days (a day missing any number is left out). */
export function parseForecast(json: unknown): DayForecast[] {
  const d = (json as { daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: (number | null)[] } } | null)?.daily;
  if (!d?.time || !d.weather_code || !d.temperature_2m_max) return [];
  return d.time.flatMap((iso, i) => {
    const code = d.weather_code![i], tempMax = d.temperature_2m_max![i];
    const rain = d.precipitation_probability_max?.[i];
    return typeof code === 'number' && typeof tempMax === 'number' ? [{ iso, code, tempMax: Math.round(tempMax), rainPct: typeof rain === 'number' ? rain : 0 }] : [];
  });
}

/** Where to ask, rounded to about 11 km so the exact place of a ride is never sent. */
export const coarse = (n: number): number => Math.round(n * 10) / 10;
export const forecastUrl = (lat: number, lng: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${coarse(lat)}&longitude=${coarse(lng)}&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=auto&forecast_days=7`;

export async function fetchForecast(lat: number, lng: number, signal?: AbortSignal): Promise<DayForecast[]> {
  const res = await fetch(forecastUrl(lat, lng), { signal });
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return parseForecast(await res.json());
}
