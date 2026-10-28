import { describe, expect, it } from 'vitest';
import { dayIndexOn, expiringBefore, rangeText, resizeDays, soonestTrip, tripStatus, whenText } from './tripPlan';

const trip = (startDate: string, days = 3, extra = {}) => ({ startDate, days: Array.from({ length: days }, (_, i) => ({ id: `d${i}` })), ...extra });

describe('tripStatus', () => {
  it('is upcoming before the start date and ready from it, until the rider starts it', () => {
    expect(tripStatus(trip('2026-11-10'), '2026-11-09')).toBe('upcoming');
    expect(tripStatus(trip('2026-11-10'), '2026-11-10')).toBe('ready');
    expect(tripStatus(trip('2026-11-10'), '2026-11-12')).toBe('ready');
  });
  it('is active only once started, and done after the last day', () => {
    expect(tripStatus(trip('2026-11-10', 3, { startedAt: 1 }), '2026-11-11')).toBe('active');
    expect(tripStatus(trip('2026-11-10', 3, { startedAt: 1 }), '2026-11-13')).toBe('done');
    expect(tripStatus(trip('2026-11-10'), '2026-11-13')).toBe('done');
  });
  it('is done when the rider ended it, and logged when it has no date', () => {
    expect(tripStatus(trip('2026-11-10', 3, { startedAt: 1, endedAt: 2 }), '2026-11-11')).toBe('done');
    expect(tripStatus({}, '2026-11-11')).toBe('logged');
  });
});

describe('days and wording', () => {
  it('finds the day a date falls on, clamped to the trip', () => {
    expect(dayIndexOn(trip('2026-11-10'), '2026-11-10')).toBe(0);
    expect(dayIndexOn(trip('2026-11-10'), '2026-11-12')).toBe(2);
    expect(dayIndexOn(trip('2026-11-10'), '2026-11-20')).toBe(2);
    expect(dayIndexOn(trip('2026-11-10'), '2026-11-01')).toBe(0);
    expect(dayIndexOn({}, '2026-11-01')).toBeNull();
  });
  it('says when a trip is', () => {
    expect(whenText(trip('2026-11-10'), '2026-11-10')).toBe('Today');
    expect(whenText(trip('2026-11-10'), '2026-11-09')).toBe('Tomorrow');
    expect(whenText(trip('2026-11-10'), '2026-11-05')).toBe('In 5 days');
    expect(whenText(trip('2026-11-10', 4, { startedAt: 1 }), '2026-11-11')).toBe('Day 2 of 4');
  });
  it('writes the date range', () => {
    expect(rangeText(trip('2026-11-10', 1))).toBe('10 Nov');
    expect(rangeText(trip('2026-11-10', 4))).toBe('10 Nov to 13 Nov');
  });
});

describe('soonestTrip', () => {
  const today = '2026-11-10';
  it('prefers a trip under way, then a ready one, then the nearest upcoming; never a finished or undated one', () => {
    const upcoming = { id: 'u', ...trip('2026-11-20') }, sooner = { id: 's', ...trip('2026-11-15') };
    const active = { id: 'a', ...trip('2026-11-09', 3, { startedAt: 1 }) }, ready = { id: 'r', ...trip('2026-11-10') };
    const done = { id: 'd', ...trip('2026-10-01') }, logged: { id: string; startDate?: string } = { id: 'l' };
    expect(soonestTrip([upcoming, sooner], today)?.id).toBe('s');
    expect(soonestTrip([upcoming, ready, sooner], today)?.id).toBe('r');
    expect(soonestTrip([upcoming, ready, active], today)?.id).toBe('a');
    expect(soonestTrip([done, logged], today)).toBeUndefined();
  });
});

describe('resizeDays and documents', () => {
  it('keeps what is on the days that stay and adds empty ones', () => {
    let n = 0;
    const days = resizeDays([{ id: 'a', note: 'Leh' }, { id: 'b' }], 3, () => `new${n++}`);
    expect(days.map((d) => d.id)).toEqual(['a', 'b', 'new0']);
    expect(resizeDays(days, 1, () => 'x')).toEqual([{ id: 'a', note: 'Leh' }]);
    expect(resizeDays(undefined, 0, () => 'x')).toHaveLength(1);
  });
  it('lists documents that run out by the last day', () => {
    expect(expiringBefore([{ label: 'Insurance', validTill: '2026-11-12' }, { label: 'PUC', validTill: '2027-01-01' }, { label: 'Licence' }], '2026-11-13')).toEqual([{ label: 'Insurance', validTill: '2026-11-12' }]);
  });
});
