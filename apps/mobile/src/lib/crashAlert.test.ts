import { describe, expect, it } from 'vitest';
import { callTargets, secondsLeft, telUrl } from './crashAlert';

describe('crash alert', () => {
  it('counts down in whole seconds, rounding up, and stops at zero', () => {
    expect(secondsLeft(60_000, 0)).toBe(60);
    expect(secondsLeft(60_000, 100)).toBe(60);
    expect(secondsLeft(60_000, 59_001)).toBe(1);
    expect(secondsLeft(60_000, 70_000)).toBe(0);
  });

  it('offers the main contact first, then 112', () => {
    const t = callTargets([{ name: 'Asha', phone: '98450 00000', primary: false }, { name: 'Ravi', phone: '98450 11111', primary: true }]);
    expect(t.map((x) => x.label)).toEqual(['Call Ravi', 'Call 112']);
  });

  it('offers only 112 when there are no contacts', () => {
    expect(callTargets([]).map((x) => x.label)).toEqual(['Call 112']);
  });

  it('strips spaces and punctuation from a number', () => {
    expect(telUrl('+91 98450-00000')).toBe('tel:+919845000000');
  });
});
