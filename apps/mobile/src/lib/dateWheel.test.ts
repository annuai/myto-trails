import { describe, expect, it } from 'vitest';
import { clampDay, clampToRange, dateFromWheel, dateToWheel, daysInMonth, dayItems, MONTH_NAMES, monthItems, yearBounds, yearItems } from './dateWheel';

describe('daysInMonth', () => {
  it('knows the month lengths', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2025, m))).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
  it('gets leap years right, including the century rules', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
  });
});

describe('clampDay', () => {
  it('moves 31 January to the end of February', () => {
    expect(clampDay(2025, 2, 31)).toBe(28);
    expect(clampDay(2024, 2, 31)).toBe(29);
    expect(clampDay(2025, 4, 31)).toBe(30);
  });
  it('leaves a day that fits, and never goes below 1', () => {
    expect(clampDay(2025, 3, 31)).toBe(31);
    expect(clampDay(2025, 2, 0)).toBe(1);
  });
});

describe('clampToRange', () => {
  it('pulls a date into min and max', () => {
    expect(clampToRange('2020-01-01', '2024-05-10', '2024-06-01')).toBe('2024-05-10');
    expect(clampToRange('2030-01-01', '2024-05-10', '2024-06-01')).toBe('2024-06-01');
    expect(clampToRange('2024-05-20', '2024-05-10', '2024-06-01')).toBe('2024-05-20');
  });
  it('works with only one bound or none', () => {
    expect(clampToRange('2020-01-01', '2024-05-10')).toBe('2024-05-10');
    expect(clampToRange('2030-01-01', undefined, '2024-06-01')).toBe('2024-06-01');
    expect(clampToRange('2030-01-01')).toBe('2030-01-01');
  });
});

describe('yearBounds', () => {
  const today = '2026-11-01';
  it('defaults to a hundred years back and five ahead', () => {
    expect(yearBounds(undefined, undefined, today)).toEqual({ first: 1926, last: 2031 });
  });
  it('takes the years of min and max', () => {
    expect(yearBounds('2026-11-02', '2030-01-01', today)).toEqual({ first: 2026, last: 2030 });
  });
  it('keeps the default on the side that has no bound, and never inverts', () => {
    expect(yearBounds('2026-11-02', undefined, today)).toEqual({ first: 2026, last: 2031 });
    expect(yearBounds(undefined, '2026-01-01', today)).toEqual({ first: 1926, last: 2026 });
    expect(yearBounds('2040-01-01', undefined, today)).toEqual({ first: 2040, last: 2040 });
  });
});

describe('wheel items', () => {
  it('lists the days of the chosen month', () => {
    expect(dayItems(2025, 2)).toHaveLength(28);
    expect(dayItems(2024, 2).at(-1)).toBe('29');
    expect(dayItems(2025, 1)[0]).toBe('1');
  });
  it('lists month names and the years of the range', () => {
    expect(monthItems()).toEqual(MONTH_NAMES);
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('January');
    expect(yearItems({ first: 2024, last: 2026 })).toEqual(['2024', '2025', '2026']);
  });
});

describe('indices and ISO dates', () => {
  const bounds = { first: 2020, last: 2030 };
  it('turns a date into wheel positions', () => {
    expect(dateToWheel('2024-02-29', bounds)).toEqual({ day: 28, month: 1, year: 4 });
  });
  it('turns positions back into a date', () => {
    expect(dateFromWheel({ day: 28, month: 1, year: 4 }, bounds)).toBe('2024-02-29');
    expect(dateFromWheel({ day: 0, month: 11, year: 10 }, bounds)).toBe('2030-12-01');
  });
  it('clamps the day when the month or year moves under it', () => {
    expect(dateFromWheel({ day: 30, month: 1, year: 5 }, bounds)).toBe('2025-02-28');
    expect(dateFromWheel({ day: 30, month: 1, year: 4 }, bounds)).toBe('2024-02-29');
  });
  it('clamps into min and max', () => {
    expect(dateFromWheel({ day: 0, month: 0, year: 0 }, bounds, '2020-03-15', '2030-06-01')).toBe('2020-03-15');
    expect(dateFromWheel({ day: 30, month: 11, year: 10 }, bounds, '2020-03-15', '2030-06-01')).toBe('2030-06-01');
  });
  it('puts a date outside the years at the nearest end', () => {
    expect(dateToWheel('2010-05-05', bounds).year).toBe(0);
    expect(dateToWheel('2099-05-05', bounds).year).toBe(10);
  });
  it('round-trips', () => {
    for (const iso of ['2020-01-01', '2024-02-29', '2027-12-31', '2030-06-15']) expect(dateFromWheel(dateToWheel(iso, bounds), bounds)).toBe(iso);
  });
});
