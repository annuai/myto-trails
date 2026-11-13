import { describe, expect, it } from 'vitest';
import { pillionReminders, WEEK_MS } from './pillionReminders';

const DAY = 86_400_000;
const noon = (d: number) => new Date(2026, 10, d, 12, 0, 0).getTime();

describe('pillion reminders', () => {
  it('waits a week after the last ride, then waits for a ride', () => {
    const r = pillionReminders({ now: noon(10), rides: [{ startedAt: noon(8) }], waited: 0 });
    expect(r).toHaveLength(1);
    expect(r[0].id).toMatch(/^pillion:waiting:/);
    expect(r[0].route).toBe('/pillion?visit=waiting');
    expect(r[0].fireAt).toBe(noon(15));
  });

  it('a rider who has never ridden is waited for from when they were first met', () => {
    expect(pillionReminders({ now: noon(10), rides: [], since: noon(9), waited: 0 })[0].fireAt).toBe(noon(16));
    expect(pillionReminders({ now: noon(10), rides: [], waited: 0 })).toEqual([]);
  });

  it('sample and simulated rides do not count', () => {
    const r = pillionReminders({ now: noon(10), rides: [{ startedAt: noon(9), sample: true }, { startedAt: noon(9), simulated: true }], since: noon(1), waited: 0 });
    expect(r[0].fireAt).toBe(noon(10) + 60_000);
  });

  it('never more than one a week: the last one holds the next back', () => {
    const lastAt = noon(10);
    const r = pillionReminders({ now: noon(11), rides: [{ startedAt: noon(1) }], lastAt, waited: 1 });
    expect(r[0].fireAt).toBe(lastAt + WEEK_MS);
  });

  it('stops after two waiting notifications with no ride between', () => {
    expect(pillionReminders({ now: noon(30), rides: [{ startedAt: noon(1) }], waited: 2 })).toEqual([]);
  });

  it('after a ride of three hours or more he is resting, an hour and a half later', () => {
    const start = noon(10) - 4 * 3600_000;
    const r = pillionReminders({ now: noon(10), rides: [{ startedAt: start, durationSec: 3.5 * 3600 }], waited: 0 });
    expect(r[0].id).toBe(`pillion:rest:${start}`);
    expect(r[0].route).toBe('/pillion?visit=rest');
    expect(r[0].fireAt).toBeGreaterThan(noon(10));
  });

  it('a long ride from yesterday no longer gets a rest notification', () => {
    const start = noon(8);
    const r = pillionReminders({ now: noon(10), rides: [{ startedAt: start, durationSec: 4 * 3600 }], waited: 0 });
    expect(r[0].id).toMatch(/^pillion:waiting:/);
  });

  it('is never sent at night: it moves to half past nine the next morning', () => {
    const start = new Date(2026, 10, 10, 17, 0).getTime();
    const [r] = pillionReminders({ now: start + 4 * 3600_000, rides: [{ startedAt: start, durationSec: 4 * 3600 }], waited: 0 });
    const d = new Date(r.fireAt);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
    expect(d.getDate()).toBe(11);
  });

  it('plans at most one', () => {
    expect(pillionReminders({ now: noon(10), rides: [{ startedAt: noon(1), durationSec: 5 * 3600 }], waited: 0 }).length).toBeLessThanOrEqual(1);
    expect(DAY).toBeGreaterThan(0);
  });
});
