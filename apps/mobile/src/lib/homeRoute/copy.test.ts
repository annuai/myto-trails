import { describe, expect, it } from 'vitest';
import { homeCopy } from './copy';
import type { HomeOffer, HomeReason } from './types';

const reasons: HomeReason[] = ['dusk', 'ride-ended', 'usual-time'];
const offer = (reason: HomeReason): HomeOffer => ({ reason, distanceM: 4200 });

describe('homeCopy', () => {
  it('gives a distinct title per reason', () => {
    const titles = reasons.map((r) => homeCopy(offer(r), {}).title);
    expect(titles).toEqual(['Daylight is running out', 'Ride home?', 'Heading home?']);
    expect(new Set(titles).size).toBe(3);
  });

  it('names the sunset clock and the ETA in the dusk body', () => {
    const { body } = homeCopy(offer('dusk'), { etaMin: 25, sunsetClock: '6:42 PM' });
    expect(body).toContain('6:42 PM');
    expect(body).toContain('25 min');
  });

  it('reads well without the facts', () => {
    for (const r of reasons) {
      const { body } = homeCopy(offer(r), {});
      expect(body).not.toMatch(/undefined|NaN/);
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it('is plain: no exclamation marks, no label or coordinates', () => {
    for (const r of reasons) {
      const { title, body } = homeCopy(offer(r), { etaMin: 12, sunsetClock: '7:05 PM' });
      expect(`${title} ${body}`).not.toContain('!');
      expect(`${title} ${body}`).not.toMatch(/Home\b.*\d+\.\d{3}|\d+\.\d{4,}/);
    }
  });
});
