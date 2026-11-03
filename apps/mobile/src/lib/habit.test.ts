import { describe, expect, it } from 'vitest';
import { findHabits, habitReminders } from './habit';

const at = (iso: string, h: number, m = 0) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m).getTime();
const ride = (iso: string, h: number, m = 0, sample = false) => ({ startedAt: at(iso, h, m), sample });
// 2026-11-03 is a Tuesday. These are the three Saturdays, Sundays and Mondays before it.
const NOW = at('2026-11-03', 12);

describe('findHabits', () => {
  it('needs rides on at least three different days in one time window', () => {
    expect(findHabits([ride('2026-10-24', 6), ride('2026-10-31', 6)], NOW)).toEqual([]);
    expect(findHabits([ride('2026-10-24', 6), ride('2026-10-31', 6), ride('2026-10-17', 6)], NOW)).toHaveLength(1);
  });
  it('treats starts within 45 minutes of each other as the same time of day', () => {
    const h = findHabits([ride('2026-10-17', 6, 0), ride('2026-10-24', 6, 25), ride('2026-10-31', 6, 40)], NOW)[0];
    expect(h.startMin).toBe(6 * 60);
    expect(h.days).toBe(3);
  });
  it('does not join rides that are hours apart', () => {
    expect(findHabits([ride('2026-10-17', 6), ride('2026-10-24', 9), ride('2026-10-31', 17)], NOW)).toEqual([]);
  });
  it('counts a day once even when it has several rides in the window', () => {
    expect(findHabits([ride('2026-10-31', 6, 0), ride('2026-10-31', 6, 20), ride('2026-10-24', 6)], NOW)).toEqual([]);
  });
  it('ignores sample rides and rides older than three weeks', () => {
    expect(findHabits([ride('2026-10-24', 6, 0, true), ride('2026-10-31', 6, 0, true), ride('2026-10-17', 6, 0, true)], NOW)).toEqual([]);
    expect(findHabits([ride('2026-10-01', 6), ride('2026-10-08', 6), ride('2026-10-31', 6)], NOW)).toEqual([]);
  });
  it('finds both ends of a commute, soonest first, each with its own weekdays', () => {
    const out = findHabits([ride('2026-10-26', 9, 30), ride('2026-10-27', 9, 35), ride('2026-10-28', 9, 25), ride('2026-10-26', 19, 30), ride('2026-10-27', 19, 40), ride('2026-10-28', 19, 20), ride('2026-10-31', 19, 30)], NOW);
    expect(out.map((h) => h.startMin)).toEqual([9 * 60 + 25, 19 * 60 + 20]);
    expect(out[0].weekdays.sort()).toEqual([1, 2, 3]);
    expect(out[1].weekdays.sort()).toEqual([1, 2, 3, 6]);
  });
  it('keeps at most three times of day', () => {
    const rides = [6, 10, 14, 18].flatMap((h) => ['2026-10-26', '2026-10-27', '2026-10-28'].map((d) => ride(d, h)));
    expect(findHabits(rides, NOW)).toHaveLength(3);
  });
  it('knows which weekdays the rider rides on', () => {
    const h = findHabits([ride('2026-10-17', 6), ride('2026-10-24', 6), ride('2026-10-25', 6)], NOW)[0]; // Sat, Sat, Sun
    expect(h.weekdays.sort()).toEqual([0, 6]);
  });
});

describe('habitReminders', () => {
  it('reminds for both ends of a commute, and a morning ride does not silence the evening one', () => {
    const commute = ['2026-10-26', '2026-10-27', '2026-10-28'].flatMap((d) => [ride(d, 9, 30), ride(d, 19, 30)]);
    const day = (now: number) => habitReminders([...commute, ride('2026-11-03', 9, 30)], now).filter((r) => r.id.startsWith('habit:2026-11-03'));
    expect(day(at('2026-11-03', 7)).map((r) => r.fireAt)).toEqual([at('2026-11-03', 9, 20), at('2026-11-03', 19, 20)]);
    expect(day(at('2026-11-03', 12)).map((r) => r.fireAt)).toEqual([at('2026-11-03', 19, 20)]);
    expect(habitReminders(commute, at('2026-11-03', 7))[1].body).toBe('You usually ride around 7:30 PM');
  });
  const sat = [ride('2026-10-17', 6, 10), ride('2026-10-24', 6, 0), ride('2026-10-31', 6, 20)];
  it('comes 10 minutes before the usual start, on the weekdays the rider rides, for the next week', () => {
    const out = habitReminders(sat, NOW);
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-11-07', 5, 50)]);
    expect(out[0]).toMatchObject({ title: 'Ready for your next ride?', route: '/ride', kind: 'ride' });
    expect(out[0].body).toBe('You usually ride around 6:00 AM');
    expect(out[0].lock).not.toMatch(/6:00/);
  });
  it('is nothing without a habit', () => {
    expect(habitReminders([ride('2026-10-31', 6)], NOW)).toEqual([]);
  });
  it('skips today when the rider has already ridden today', () => {
    const daily = [ride('2026-10-27', 6), ride('2026-10-31', 6), ride('2026-11-01', 6), ride('2026-11-02', 6), ride('2026-11-03', 5)];
    const ids = (now: number) => habitReminders(daily, now).map((r) => r.id);
    expect(habitReminders(daily.slice(0, 4), at('2026-11-03', 5, 30)).map((r) => r.id)).toContain('habit:2026-11-03:360');
    expect(ids(at('2026-11-03', 5, 30))).not.toContain('habit:2026-11-03:360');
  });
  it('skips a time that has already passed, so today comes only if it is still ahead', () => {
    const daily = [ride('2026-10-27', 14), ride('2026-10-31', 14), ride('2026-11-01', 14), ride('2026-11-02', 14)];
    expect(habitReminders(daily, at('2026-11-03', 13, 0))[0].fireAt).toBe(at('2026-11-03', 13, 50));
    expect(habitReminders(daily, at('2026-11-03', 13, 55))[0].fireAt).toBe(at('2026-11-07', 13, 50)); // no Wednesday rides, so the next is Saturday
  });
  it('has an id that depends on the date, so a re-plan does not duplicate it', () => {
    expect(habitReminders(sat, NOW)[0].id).toBe('habit:2026-11-07:360');
  });
});
