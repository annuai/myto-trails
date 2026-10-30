import { toISO } from './dates';
import { deviceLocale } from './locale';

/** The rider's bike economy and the petrol price, from a date on. Changing either adds a new entry, so earlier rides keep the price they had. */
export type FuelSetting = { from: string; kmPerLitre: number; pricePerLitre: number };
export type CostRide = { id: string; startedAt: number; distanceKm: number; sample?: boolean };
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

/** Litres and rupees for a ride at the economy and price in force the day it started. Null when nothing has been set. */
export function rideCost(ride: CostRide, history: FuelSetting[]): { litres: number; cost: number } | null {
  const s = settingFor(history, rideDate(ride));
  if (!s || s.kmPerLitre <= 0) return null;
  const litres = ride.distanceKm / s.kmPerLitre;
  return { litres, cost: litres * s.pricePerLitre };
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

/** A whole amount in the rider's currency ("₹1,23,456", "$1,235"), grouped the way their phone groups numbers. With no currency known it is a plain number. */
export const formatMoney = (n: number, currency: string | null, locale: string = deviceLocale()): string =>
  currency
    ? new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(Math.round(n))
    : Math.round(n).toLocaleString(locale);
/** Just the symbol ("₹"), or an empty string when there is no currency. */
export const currencySymbol = (currency: string | null, locale: string = deviceLocale()): string =>
  currency ? new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency : '';
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
