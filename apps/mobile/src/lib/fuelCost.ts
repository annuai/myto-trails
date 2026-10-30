import { toISO } from './dates';
import { CURRENCY_SYMBOL } from './countryData';
import { deviceLocale } from './locale';

/** The rider's bike economy and the petrol price, from a date on. Changing either adds a new entry, so earlier rides keep the price they had. */
export type FuelSetting = { from: string; kmPerLitre: number; pricePerLitre: number };
export type CostRide = { id: string; startedAt: number; distanceKm: number; /** With the time, the cost allows for how fast the ride was on average. */ durationSec?: number; sample?: boolean };
export type RideCostItem<R extends CostRide = CostRide> = { ride: R; litres: number; cost: number };
export type CostSummary<R extends CostRide = CostRide> = { items: RideCostItem<R>[]; totalCost: number; totalLitres: number; totalKm: number; count: number };

export const MIN_KM_PER_LITRE = 5;
export const MAX_KM_PER_LITRE = 150;
export const MAX_PRICE_PER_LITRE = 1000;

/** The setting in force on a date: the latest one that began on or before it, or the earliest one for a ride from before any were set. */
export function settingFor(history: FuelSetting[], date: string): FuelSetting | undefined {
  const sorted = [...history].sort((a, b) => a.from.localeCompare(b.from));
  return [...sorted].reverse().find((s) => s.from <= date) ?? sorted[0];
}

/** Adds a setting from `from`, replacing one that already began that day (so correcting a typo does not leave two). */
export const upsertSetting = (history: FuelSetting[], next: FuelSetting): FuelSetting[] => [...history.filter((s) => s.from !== next.from), next].sort((a, b) => a.from.localeCompare(b.from));

export const rideDate = (ride: { startedAt: number }) => toISO(new Date(ride.startedAt));

/** The average speed the rider's own mileage stands for: ordinary mixed riding. Rides faster or slower than this change the economy. */
export const REFERENCE_KMH = 45;
/**
 * How much of its usual mileage a bike gets at an average speed (including stops). A rough curve for a commuter or tourer, not a
 * measurement of this bike: stop-go traffic wastes petrol, a steady 50 to 60 km/h is the best, and wind drag eats it above 80.
 * It is kept within 0.7 to 1.1 so a wrong guess cannot change a cost by much.
 */
const SPEED_CURVE: ReadonlyArray<readonly [kmh: number, factor: number]> = [[10, 0.7], [20, 0.8], [30, 0.92], [45, 1], [60, 1.05], [80, 0.97], [100, 0.85], [120, 0.72]];
export function speedFactor(avgKmh: number): number {
  const first = SPEED_CURVE[0]!, last = SPEED_CURVE[SPEED_CURVE.length - 1]!;
  if (!(avgKmh > first[0])) return first[1];
  if (avgKmh >= last[0]) return last[1];
  const i = SPEED_CURVE.findIndex(([k]) => k >= avgKmh);
  const [k0, f0] = SPEED_CURVE[i - 1]!, [k1, f1] = SPEED_CURVE[i]!;
  return f0 + ((avgKmh - k0) / (k1 - k0)) * (f1 - f0);
}

/** The mileage that fill-ups show: all the distance over all the petrol. Adding first, not averaging each, so a small top-up does not count as much as a long tank. Null with nothing usable. */
export function mileageFromFills(fills: { km: number; litres: number }[]): number | null {
  const good = fills.filter((f) => f.km > 0 && f.litres > 0);
  const litres = good.reduce((n, f) => n + f.litres, 0);
  return litres > 0 ? good.reduce((n, f) => n + f.km, 0) / litres : null;
}

/**
 * Litres and money for a ride at the economy and price in force the day it started. Given the ride's time, the economy is
 * adjusted for its average speed (`speedFactor`); without it, the plain mileage is used. Null when nothing has been set.
 */
export function rideCost(ride: CostRide, history: FuelSetting[]): { litres: number; cost: number; /** The ride's average speed, when it has a time. */ avgKmh?: number; /** The economy this ride got after the speed adjustment. */ kmPerLitre: number } | null {
  const s = settingFor(history, rideDate(ride));
  if (!s || s.kmPerLitre <= 0) return null;
  const avgKmh = ride.durationSec && ride.durationSec >= 60 && ride.distanceKm > 0 ? ride.distanceKm / (ride.durationSec / 3600) : undefined;
  const kmPerLitre = s.kmPerLitre * (avgKmh === undefined ? 1 : speedFactor(avgKmh) / speedFactor(REFERENCE_KMH));
  const litres = ride.distanceKm / kmPerLitre;
  return { litres, cost: litres * s.pricePerLitre, avgKmh, kmPerLitre };
}

/** The rides that started from `from` to `to` (both included), newest first, with what each cost and the totals. Sample rides do not count. */
export function costsBetween<R extends CostRide>(rides: R[], history: FuelSetting[], from: string, to: string): CostSummary<R> {
  const items: RideCostItem<R>[] = [];
  for (const ride of rides) {
    if (ride.sample) continue;
    const d = rideDate(ride);
    if (d < from || d > to) continue;
    const c = rideCost(ride, history);
    if (c) items.push({ ride, ...c });
  }
  items.sort((a, b) => b.ride.startedAt - a.ride.startedAt);
  return { items, totalCost: items.reduce((n, i) => n + i.cost, 0), totalLitres: items.reduce((n, i) => n + i.litres, 0), totalKm: items.reduce((n, i) => n + i.ride.distanceKm, 0), count: items.length };
}

/** The sign for a currency ("₹", "$", "R$"), or its code when it has no usual sign ("CHF"). Empty when there is no currency. From a bundled table: no phone's Intl is needed. */
export const currencySymbol = (currency: string | null): string => (currency ? CURRENCY_SYMBOL[currency] ?? currency : '');

const group = (n: number, locale: string): string => {
  try {
    return n.toLocaleString(locale);
  } catch {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

/** A whole amount in the rider's currency ("₹1,23,456", "$1,235", "CHF 1,235"), grouped the way their phone groups numbers. With no currency known it is a plain number. */
export const formatMoney = (n: number, currency: string | null, locale: string = deviceLocale()): string => {
  const whole = group(Math.round(n), locale);
  const sign = currencySymbol(currency);
  return !sign ? whole : /^[A-Za-z]+$/.test(sign) ? `${sign} ${whole}` : `${sign}${whole}`;
};
/** What the rider calls it: "gas" in the places that do, else "petrol". */
export const fuelWord = (country: string | null | undefined): 'gas' | 'petrol' => (country && ['US', 'CA', 'PH'].includes(country.toUpperCase()) ? 'gas' : 'petrol');
export const formatLitres = (n: number): string => `${n < 10 ? n.toFixed(1) : Math.round(n)} L`;

/** A number typed into a field ("35", "104.5", "104,5"), or null when it is not a usable number. */
export const parseAmount = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
export const validSetting = (kmPerLitre: number | null, pricePerLitre: number | null): boolean =>
  kmPerLitre !== null && pricePerLitre !== null && kmPerLitre >= MIN_KM_PER_LITRE && kmPerLitre <= MAX_KM_PER_LITRE && pricePerLitre <= MAX_PRICE_PER_LITRE;

/** Ready-made ranges for the page, as YYYY-MM-DD dates on the rider's own calendar. */
export function monthRange(today: string): { from: string; to: string } {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}
export function lastMonthRange(today: string): { from: string; to: string } {
  const y = +today.slice(0, 4), m = +today.slice(5, 7);
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(new Date(py, pm, 0).getDate())}` };
}
export const yearRange = (today: string): { from: string; to: string } => ({ from: `${today.slice(0, 4)}-01-01`, to: today });
