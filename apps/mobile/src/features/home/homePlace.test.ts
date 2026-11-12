import { describe, expect, it } from 'vitest';
import { FIX_MAX_AGE_MS } from '@/lib/homeRoute/types';
import { canEnableAutoEnd, canUseCurrentLocation, currentLocationLabel, isFreshFix } from './homePlace';

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
  it('current location is off only when permission is denied', () => {
    expect(canUseCurrentLocation('denied')).toBe(false);
    expect(canUseCurrentLocation('undetermined')).toBe(true);
    expect(canUseCurrentLocation('granted')).toBe(true);
    expect(canUseCurrentLocation(undefined)).toBe(true);
  });
  it('a stored fix older than FIX_MAX_AGE_MS, or without a time, is not fresh', () => {
    expect(isFreshFix(1000, 1000 + FIX_MAX_AGE_MS)).toBe(true);
    expect(isFreshFix(1000, 1001 + FIX_MAX_AGE_MS)).toBe(false);
    expect(isFreshFix(undefined, 1000)).toBe(false);
  });
});
