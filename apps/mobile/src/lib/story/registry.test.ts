import { describe, expect, it } from 'vitest';
import { markViews } from './registry';
import { MARKS } from '../marks';

const real = { distanceKm: 120, startedAt: new Date(2026, 5, 8, 9).getTime(), durationSec: 3600 };
const input = (rides: object[]) => ({ rides: rides as never[], servicesDone: 0, fixesDone: 0 });

describe('markViews', () => {
  it('earns first-ride and km-100 from one real 120 km ride, as personal', () => {
    const v = markViews(input([real]), undefined);
    for (const id of ['first-ride', 'km-100']) expect(v.find((m) => m.id === id)).toMatchObject({ state: 'earned', category: 'personal', fraction: 1 });
  });
  it('keeps every local mark locked for the sample ride alone', () => {
    const v = markViews(input([{ ...real, sample: true }]), undefined).slice(0, MARKS.length);
    expect(v.map((m) => m.id)).toEqual(MARKS.map((m) => m.id));
    expect(v.every((m) => m.state === 'locked' && m.category === 'personal')).toBe(true);
  });
  it('marks a server badge needs_data, not locked, while the server is unknown', () => {
    expect(markViews(input([]), undefined).find((m) => m.id === 'explorer')?.state).toBe('needs_data');
  });
  it('uses server numbers when known', () => {
    expect(markViews(input([]), { trailsRiddenDistinct: 10 }).find((m) => m.id === 'explorer')?.state).toBe('earned');
  });
  it('has unique ids across marks and badges', () => {
    const ids = markViews(input([]), undefined).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
