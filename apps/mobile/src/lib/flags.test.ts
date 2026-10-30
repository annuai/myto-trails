import { describe, expect, it } from 'vitest';
import { riderOsOn } from './flags';

describe('riderOsOn', () => {
  it('is off unless the build sets it to 1', () => {
    expect(riderOsOn({})).toBe(false);
    expect(riderOsOn({ EXPO_PUBLIC_RIDER_OS: '' })).toBe(false);
    expect(riderOsOn({ EXPO_PUBLIC_RIDER_OS: 'true' })).toBe(false);
    expect(riderOsOn({ EXPO_PUBLIC_RIDER_OS: '1' })).toBe(true);
  });
});
