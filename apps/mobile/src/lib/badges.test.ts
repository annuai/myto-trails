import { describe, expect, it } from 'vitest';
import { badgeGroups, localSnapshot, weekendsRidden } from './badges';
import type { MarkRide } from './marks';

const ride = (y: number, m: number, d: number, o: Partial<MarkRide> = {}): MarkRide => ({ distanceKm: 20, startedAt: new Date(y, m, d, 9).getTime(), durationSec: 3600, ...o });
// 2026-06-06 is a Saturday, 2026-06-07 a Sunday.

describe('weekendsRidden', () => {
  it('counts a weekend once however many rides or days', () => {
    expect(weekendsRidden([ride(2026, 5, 6), ride(2026, 5, 6), ride(2026, 5, 7)])).toBe(1);
  });
  it('counts different weekends, in a row or not', () => {
    expect(weekendsRidden([ride(2026, 5, 6), ride(2026, 5, 20), ride(2026, 6, 4)])).toBe(3);
  });
  it('ignores weekdays and the sample ride', () => {
    expect(weekendsRidden([ride(2026, 5, 8), ride(2026, 5, 6, { sample: true })])).toBe(0);
  });
  it('ignores how far the ride was', () => {
    expect(weekendsRidden([ride(2026, 5, 6, { distanceKm: 1 })])).toBe(weekendsRidden([ride(2026, 5, 6, { distanceKm: 900 })]));
  });
});

describe('badgeGroups', () => {
  it('shows Weekend Wanderer progress from the phone while server badges wait for data', () => {
    const all = badgeGroups([ride(2026, 5, 6), ride(2026, 5, 13)], undefined).flatMap((g) => g.items);
    expect(all.find((s) => s.def.id === 'weekend-wanderer')).toMatchObject({ state: 'in_progress', current: 2, target: 5 });
    expect(all.find((s) => s.def.id === 'explorer')?.state).toBe('needs_data');
  });
  it('uses server numbers when they are known', () => {
    const all = badgeGroups([], { approvedTrails: 1, trailsRiddenDistinct: 10 }).flatMap((g) => g.items);
    expect(all.find((s) => s.def.id === 'pathfinder')?.state).toBe('earned');
    expect(all.find((s) => s.def.id === 'explorer')?.state).toBe('earned');
  });
  it('has a local snapshot with only phone metrics', () => {
    expect(Object.keys(localSnapshot([]))).toEqual(['weekendsRidden']);
  });
});
