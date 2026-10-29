import { describe, expect, it } from 'vitest';
import { costsBetween, formatLitres, formatRupees, lastMonthRange, monthRange, parseAmount, rideCost, settingFor, upsertSetting, validSetting, yearRange, type CostRide, type FuelSetting } from './fuelCost';

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime();
const ride = (id: string, startedAt: number, distanceKm: number, extra: Partial<CostRide> = {}): CostRide => ({ id, startedAt, distanceKm, ...extra });
const s = (from: string, kmPerLitre: number, pricePerLitre: number): FuelSetting => ({ from, kmPerLitre, pricePerLitre });

describe('settingFor', () => {
  const history = [s('2026-01-01', 35, 100), s('2026-06-01', 35, 110)];
  it('uses the latest setting that began on or before the day', () => {
    expect(settingFor(history, '2026-05-31')!.pricePerLitre).toBe(100);
    expect(settingFor(history, '2026-06-01')!.pricePerLitre).toBe(110);
    expect(settingFor(history, '2026-12-31')!.pricePerLitre).toBe(110);
  });
  it('uses the earliest setting for a ride from before any were set, and nothing when none exist', () => {
    expect(settingFor(history, '2025-03-01')!.from).toBe('2026-01-01');
    expect(settingFor([], '2026-05-01')).toBeUndefined();
  });
});

describe('upsertSetting', () => {
  it('adds a new date and replaces one from the same day', () => {
    const one = upsertSetting([], s('2026-06-01', 35, 100));
    expect(upsertSetting(one, s('2026-06-01', 40, 105))).toEqual([s('2026-06-01', 40, 105)]);
    expect(upsertSetting(one, s('2026-05-01', 30, 95)).map((x) => x.from)).toEqual(['2026-05-01', '2026-06-01']);
  });
});

describe('rideCost', () => {
  it('is distance over economy, times the price in force that day', () => {
    const c = rideCost(ride('a', at(2026, 6, 10), 70), [s('2026-01-01', 35, 100)])!;
    expect(c.litres).toBe(2);
    expect(c.cost).toBe(200);
  });
  it('keeps an old ride at the old price after the price changes', () => {
    const history = [s('2026-01-01', 35, 100), s('2026-06-01', 35, 120)];
    expect(rideCost(ride('old', at(2026, 5, 20), 35), history)!.cost).toBe(100);
    expect(rideCost(ride('new', at(2026, 6, 20), 35), history)!.cost).toBe(120);
  });
  it('is null when nothing is set', () => {
    expect(rideCost(ride('a', at(2026, 6, 10), 70), [])).toBeNull();
  });
});

describe('costsBetween', () => {
  const history = [s('2026-01-01', 35, 100)];
  const rides = [ride('a', at(2026, 6, 1), 70), ride('b', at(2026, 6, 15), 35), ride('c', at(2026, 5, 31, 23), 35), ride('d', at(2026, 6, 30), 35, { sample: true }), ride('e', at(2026, 7, 1, 0), 35)];
  it('lists the rides in the range, newest first, with the totals; the range includes both ends', () => {
    const r = costsBetween(rides, history, '2026-06-01', '2026-06-30');
    expect(r.items.map((i) => i.ride.id)).toEqual(['b', 'a']);
    expect(r.totalCost).toBe(300);
    expect(r.totalLitres).toBe(3);
    expect(r.totalKm).toBe(105);
    expect(r.count).toBe(2);
  });
  it('is empty with nothing set, or for a range with no rides', () => {
    expect(costsBetween(rides, [], '2026-06-01', '2026-06-30').count).toBe(0);
    expect(costsBetween(rides, history, '2026-02-01', '2026-02-28').totalCost).toBe(0);
  });
});

describe('numbers and ranges', () => {
  it('writes rupees with Indian grouping and litres to a sensible precision', () => {
    expect(formatRupees(123456.4)).toBe('₹1,23,456');
    expect(formatLitres(2.345)).toBe('2.3 L');
    expect(formatLitres(41.6)).toBe('42 L');
  });
  it('reads typed amounts, with a comma or a point, and refuses nonsense', () => {
    expect(parseAmount(' 104,5 ')).toBe(104.5);
    expect(parseAmount('35')).toBe(35);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-3')).toBeNull();
  });
  it('accepts a sensible economy and price only', () => {
    expect(validSetting(35, 104)).toBe(true);
    expect(validSetting(2, 104)).toBe(false);
    expect(validSetting(500, 104)).toBe(false);
    expect(validSetting(35, 5000)).toBe(false);
    expect(validSetting(null, 104)).toBe(false);
  });
  it('gives this month, last month (across a year) and this year', () => {
    expect(monthRange('2026-10-29')).toEqual({ from: '2026-10-01', to: '2026-10-29' });
    expect(lastMonthRange('2026-10-29')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(lastMonthRange('2026-01-05')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(lastMonthRange('2026-03-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(yearRange('2026-10-29')).toEqual({ from: '2026-01-01', to: '2026-10-29' });
  });
});
