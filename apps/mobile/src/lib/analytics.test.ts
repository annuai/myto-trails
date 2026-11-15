import { beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.fn();
const optIn = vi.fn();
const optOut = vi.fn();
const ctor = vi.fn();
const state = { usageStats: true, setUsageStats: vi.fn((on: boolean) => { state.usageStats = on; }) };

vi.mock('posthog-react-native', () => ({
  default: class { constructor(...a: unknown[]) { ctor(...a); } capture = capture; optIn = optIn; optOut = optOut; },
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('expo-router', () => ({ useSegments: () => [] }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('@/store/appearance', () => ({ useAppearance: { getState: () => state } }));

import { setAnalyticsClient, setUsageStats, track } from './analytics';
import { startAnalytics } from './analytics.run';

describe('usage statistics', () => {
  beforeEach(() => { vi.clearAllMocks(); setAnalyticsClient(null); state.usageStats = true; });
  it('stays off without a key and in a development build', () => {
    expect(startAnalytics('')).toBe(false);
    expect(startAnalytics('phc_x', true)).toBe(false);
    track('app_opened');
    expect(ctor).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });
  it('starts on the EU host with no person profile, location lookup or replay', () => {
    expect(startAnalytics('phc_x', false)).toBe(true);
    expect(ctor).toHaveBeenCalledWith('phc_x', expect.objectContaining({ host: 'https://eu.i.posthog.com', personProfiles: 'never', disableGeoip: true, enableSessionReplay: false, defaultOptIn: true }));
  });
  it('scrubs props before they are sent', () => {
    startAnalytics('phc_x', false);
    track('ride_finished', { distanceKm: 41.7, durationMin: 93, lat: 12.9 });
    expect(capture).toHaveBeenCalledWith('ride_finished', { distanceKm: 42, durationMin: 95 });
  });
  it('sends nothing once the rider turns it off, and resumes when turned back on', () => {
    startAnalytics('phc_x', false);
    setUsageStats(false);
    expect(optOut).toHaveBeenCalled();
    track('app_opened');
    expect(capture).not.toHaveBeenCalled();
    setUsageStats(true);
    expect(optIn).toHaveBeenCalled();
    track('app_opened');
    expect(capture).toHaveBeenCalledWith('app_opened', {});
  });
});
