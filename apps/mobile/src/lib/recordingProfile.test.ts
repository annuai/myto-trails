import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-location', () => ({ Accuracy: { Balanced: 3, High: 4, BestForNavigation: 6 } }));

import { chooseProfile, IDLE_AFTER_STOP_MS, MIN_SWITCH_MS, type RecordingProfile } from './recordingProfile';

const NOW = 1_000_000;
const base = { current: 'full' as RecordingProfile, lastSwitchAt: 0, now: NOW, batteryPct: 80 as number | null, charging: false, navigating: false, stoppedForMs: 0, speedKmh: 40, enabled: true };
const pick = (o: Partial<typeof base>) => chooseProfile({ ...base, ...o });

describe('chooseProfile', () => {
  it('full by default and when disabled', () => {
    expect(pick({})).toBe('full');
    expect(pick({ enabled: false, batteryPct: 5, stoppedForMs: IDLE_AFTER_STOP_MS * 2, speedKmh: 0 })).toBe('full');
    expect(pick({ enabled: false, current: 'idle', speedKmh: 0 })).toBe('full');
  });

  it('idle after 2 minutes standing, and back to full at 5 km/h immediately even inside MIN_SWITCH_MS', () => {
    expect(pick({ stoppedForMs: IDLE_AFTER_STOP_MS - 1, speedKmh: 0 })).toBe('full');
    expect(pick({ stoppedForMs: IDLE_AFTER_STOP_MS, speedKmh: 0 })).toBe('idle');
    expect(pick({ current: 'idle', lastSwitchAt: NOW - 1000, stoppedForMs: 0, speedKmh: 4.9 })).toBe('idle');
    expect(pick({ current: 'idle', lastSwitchAt: NOW - 1000, stoppedForMs: IDLE_AFTER_STOP_MS * 3, speedKmh: 5 })).toBe('full');
    // Waking on a low battery goes to saver, not full.
    expect(pick({ current: 'idle', lastSwitchAt: NOW - 1000, speedKmh: 30, batteryPct: 15 })).toBe('saver');
  });

  it('saver at 20% unplugged, not when charging', () => {
    expect(pick({ batteryPct: 21 })).toBe('full');
    expect(pick({ batteryPct: 20 })).toBe('saver');
    expect(pick({ batteryPct: 20, charging: true })).toBe('full');
  });

  it('navigating keeps full at 15% but saver at 9%', () => {
    expect(pick({ navigating: true, batteryPct: 15 })).toBe('full');
    expect(pick({ navigating: true, batteryPct: 9 })).toBe('saver');
  });

  it('saver is not left until 25%', () => {
    expect(pick({ current: 'saver', batteryPct: 22 })).toBe('saver');
    expect(pick({ current: 'saver', batteryPct: 26 })).toBe('full');
    expect(pick({ current: 'saver', batteryPct: 22, charging: true })).toBe('full');
  });

  it('null battery stays full', () => {
    expect(pick({ batteryPct: null })).toBe('full');
    expect(pick({ current: 'saver', batteryPct: null })).toBe('full');
  });

  it('no switch inside MIN_SWITCH_MS except to wake', () => {
    const recent = NOW - MIN_SWITCH_MS + 1;
    expect(pick({ lastSwitchAt: recent, batteryPct: 10 })).toBe('full');
    expect(pick({ lastSwitchAt: NOW - MIN_SWITCH_MS, batteryPct: 10 })).toBe('saver');
    expect(pick({ current: 'saver', lastSwitchAt: recent, batteryPct: 90 })).toBe('saver');
    expect(pick({ lastSwitchAt: recent, stoppedForMs: IDLE_AFTER_STOP_MS, speedKmh: 0 })).toBe('full');
    expect(pick({ current: 'idle', lastSwitchAt: recent, speedKmh: 20 })).toBe('full');
  });
});
