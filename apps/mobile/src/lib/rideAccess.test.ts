import { describe, expect, it } from 'vitest';
import { needsSettings } from './rideAccess';

describe('needsSettings', () => {
  it('is never needed once Always is on', () => {
    expect(needsSettings('unknown', 'always', 'android')).toBe(false);
    expect(needsSettings('foreground', 'always', 'ios')).toBe(false);
  });
  it('is needed when location is denied', () => {
    expect(needsSettings('unknown', 'denied', 'ios')).toBe(true);
    expect(needsSettings('unknown', 'denied', 'android')).toBe(true);
  });
  it('on Android, While using the app on a first ask still sends the rider to Settings', () => {
    expect(needsSettings('unknown', 'foreground', 'android')).toBe(true);
  });
  it('on iOS, the first While Using answer goes on to ride, the second sends to Settings', () => {
    expect(needsSettings('unknown', 'foreground', 'ios')).toBe(false);
    expect(needsSettings('foreground', 'foreground', 'ios')).toBe(true);
  });
});
