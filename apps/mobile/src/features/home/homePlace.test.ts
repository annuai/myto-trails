import { describe, expect, it } from 'vitest';
import { canEnableAutoEnd, currentLocationLabel } from './homePlace';

const p = { lat: 1, lng: 2, label: 'x', setAt: 0 };
describe('home place helpers', () => {
  it('allows auto-end only once Home or Work is set', () => {
    expect(canEnableAutoEnd()).toBe(false);
    expect(canEnableAutoEnd(p)).toBe(true);
    expect(canEnableAutoEnd(undefined, p)).toBe(true);
  });
  it('labels the current location by kind', () => {
    expect(currentLocationLabel('home')).toBe('Home');
    expect(currentLocationLabel('work')).toBe('Work');
  });
});
