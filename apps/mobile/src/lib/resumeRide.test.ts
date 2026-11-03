import { describe, expect, it } from 'vitest';
import { gapText, lastFixAt, resumeAction, RESUME_WITHIN_MS } from './resumeRide';

describe('resumeAction', () => {
  it('takes up a ride whose last fix is recent and asks about an old one', () => {
    expect(resumeAction(1000, 1000 + 60_000)).toBe('resume');
    expect(resumeAction(1000, 1000 + RESUME_WITHIN_MS)).toBe('resume');
    expect(resumeAction(1000, 1000 + RESUME_WITHIN_MS + 1)).toBe('ask');
  });
});
describe('lastFixAt', () => {
  it('is the last fix, or the start when there is none', () => {
    expect(lastFixAt({ meta: { startedAt: 5, source: 'gps' }, points: [{ lat: 0, lng: 0, t: 7 }, { lat: 0, lng: 0, t: 9 }] })).toBe(9);
    expect(lastFixAt({ meta: { startedAt: 5, source: 'gps' }, points: [] })).toBe(5);
  });
});
describe('gapText', () => {
  it('says seconds, minutes, then hours', () => {
    expect(gapText(40_000)).toBe('40 s');
    expect(gapText(4 * 60_000)).toBe('4 min');
    expect(gapText(65 * 60_000)).toBe('1 h 5 min');
    expect(gapText(60 * 60_000)).toBe('1 h');
  });
});
