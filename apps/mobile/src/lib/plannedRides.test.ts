import { describe, expect, it } from 'vitest';
import { LATE_WINDOW_MIN, plannedSlots, slotTimeText } from './plannedRides';

const at = (iso: string, h: number, m = 0) => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y!, mo! - 1, d!, h, m).getTime(); };
const trip = (id: string, startDate: string, startTime: number, extra: object = {}) => ({ id, startDate, startTime, rideIds: [] as string[], days: [{}] as unknown[], ...extra });
const none = new Map<string, number[]>();

describe('plannedSlots', () => {
  it('lists today\'s trips closest to the current time first', () => {
    const now = at('2026-11-02', 9, 0);
    const s = plannedSlots([trip('far', '2026-11-02', 18 * 60), trip('late', '2026-11-02', 7 * 60), trip('soon', '2026-11-02', 9 * 60 + 30)], none, now);
    expect(s.map((x) => x.trip.id)).toEqual(['soon', 'late', 'far']);
    expect(s[1]!.sinceMin).toBe(120);
  });
  it('still offers an unstarted trip up to 12 hours late, then stops', () => {
    expect(plannedSlots([trip('a', '2026-11-02', 6 * 60)], none, at('2026-11-02', 18, 0))).toHaveLength(1);
    expect(plannedSlots([trip('a', '2026-11-02', 6 * 60)], none, at('2026-11-02', 18, 1))).toHaveLength(0);
    expect(LATE_WINDOW_MIN).toBe(720);
  });
  it('offers last night\'s late start after midnight but not yesterday\'s upcoming', () => {
    expect(plannedSlots([trip('a', '2026-11-01', 23 * 60)], none, at('2026-11-02', 1, 0))).toHaveLength(1);
    expect(plannedSlots([trip('a', '2026-11-01', 7 * 60)], none, at('2026-11-02', 9, 0))).toHaveLength(0);
    expect(plannedSlots([trip('a', '2026-11-01', 7 * 60)], none, at('2026-11-02', 20, 0))).toHaveLength(0);
  });
  it('skips trips that are started, ended, tomorrow or undated', () => {
    const now = at('2026-11-02', 8, 0);
    expect(plannedSlots([trip('s', '2026-11-02', 420, { startedAt: 1 }), trip('e', '2026-11-02', 420, { endedAt: 1 }), trip('t', '2026-11-03', 420), { id: 'u', rideIds: [] }], none, now)).toEqual([]);
  });
  it('offers a later day of a trip under way until that day has a ride', () => {
    const days = [{}, {}, {}] as unknown[];
    const t = trip('m', '2026-11-01', 420, { days, startedAt: 1 });
    const now = at('2026-11-02', 8, 0);
    expect(plannedSlots([t], none, now).map((x) => x.dayIndex)).toEqual([1]);
    expect(plannedSlots([t], new Map([['m', [at('2026-11-02', 7, 30)]]]), now)).toEqual([]);
  });
});

describe('slotTimeText', () => {
  it('states time as a fact', () => {
    expect(slotTimeText(-25, 9 * 60)).toMatch(/^Starts .* · in 25 min$/);
    expect(slotTimeText(2, 9 * 60)).toMatch(/^Starting now/);
    expect(slotTimeText(130, 7 * 60)).toMatch(/^Planned for .* · 2 h 10 min ago$/);
  });
});
