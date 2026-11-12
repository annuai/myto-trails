import { describe, expect, it } from 'vitest';
import { higherTitle, monthsRidden, titleFor } from './titles';

describe('titleFor', () => {
  it('gives no title for zero rides, never a beginner label', () => {
    expect(titleFor({ rides: 0, monthsRidden: 0 })).toBeNull();
  });
  it('starts at day-tripper', () => {
    expect(titleFor({ rides: 1, monthsRidden: 1 })).toBe('day-tripper');
  });
  it('needs trails for ghat-rider; undefined trails count as 0', () => {
    expect(titleFor({ rides: 15, monthsRidden: 6 })).toBe('trail-regular');
    expect(titleFor({ rides: 15, monthsRidden: 6, trailsRidden: 5 })).toBe('ghat-rider');
  });
  it('reaches the top rung when all hold', () => {
    expect(titleFor({ rides: 80, monthsRidden: 18, trailsRidden: 20 })).toBe('road-veteran');
    expect(titleFor({ rides: 30, monthsRidden: 9, trailsRidden: 10 })).toBe('long-hauler');
  });
});

describe('higherTitle', () => {
  it('picks the higher rung and handles null', () => {
    expect(higherTitle('ghat-rider', 'trail-regular')).toBe('ghat-rider');
    expect(higherTitle('trail-regular', 'ghat-rider')).toBe('ghat-rider');
    expect(higherTitle(null, 'day-tripper')).toBe('day-tripper');
    expect(higherTitle(null, null)).toBeNull();
  });
});

describe('monthsRidden', () => {
  it('counts distinct local months and ignores samples', () => {
    const d = (y: number, m: number, day: number) => new Date(y, m, day, 10).getTime();
    expect(
      monthsRidden([
        { startedAt: d(2026, 0, 3) },
        { startedAt: d(2026, 0, 20) },
        { startedAt: d(2026, 1, 2) },
        { startedAt: d(2026, 5, 2), sample: true },
      ]),
    ).toBe(2);
  });
});
