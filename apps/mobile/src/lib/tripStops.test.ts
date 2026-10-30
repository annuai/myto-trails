import { describe, expect, it } from 'vitest';
import { addStop, copyDays, moveStop, removeStop, stopClock, type TripStop } from './tripStops';

const s = (id: string, etaMin?: number): TripStop => ({ id, name: id, kind: 'other', ...(etaMin !== undefined ? { etaMin } : {}) });

describe('trip stops', () => {
  it('adds at the end, starting from nothing', () => {
    expect(addStop(undefined, s('a')).map((x) => x.id)).toEqual(['a']);
    expect(addStop([s('a')], s('b')).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('moves a stop up or down and stops at the ends', () => {
    const list = [s('a'), s('b'), s('c')];
    expect(moveStop(list, 'b', -1).map((x) => x.id)).toEqual(['b', 'a', 'c']);
    expect(moveStop(list, 'b', 1).map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(moveStop(list, 'a', -1)).toEqual(list);
    expect(moveStop(list, 'c', 1)).toEqual(list);
    expect(moveStop(list, 'zzz', 1)).toEqual(list);
  });
  it('removes a stop without touching the others', () => {
    expect(removeStop([s('a'), s('b')], 'a').map((x) => x.id)).toEqual(['b']);
  });
  it('turns minutes into the day into a clock time from the day start, or nothing without an estimate', () => {
    expect(stopClock(7 * 60, 90)).toBe('8:30 AM');
    expect(stopClock(7 * 60)).toBeUndefined();
    expect(stopClock(23 * 60, 120)).toBe('1:00 AM');
  });
  it('copies days with new ids and keeps note, route and stops', () => {
    let n = 0;
    const days = [{ id: 'd1', note: 'hills', route: { kind: 'mine' as const, id: 'r', name: 'R' }, stops: [s('a')] }, { id: 'd2' }];
    const out = copyDays(days, () => `n${++n}`);
    expect(out.map((d) => d.id)).toEqual(['n1', 'n3']);
    expect(out[0]).toMatchObject({ note: 'hills', route: { id: 'r' } });
    expect(out[0]!.stops![0]).toMatchObject({ name: 'a', id: 'n2' });
    expect(days[0]!.id).toBe('d1');
  });
});
