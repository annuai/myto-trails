import { beforeEach, describe, expect, it } from 'vitest';
import { COUNTDOWN_MS } from '@/lib/crashAlert';
import { create } from 'zustand';
import type { CrashEvidence } from '@/lib/crashDetect';
import { crashSlice } from './crashCore';

const useCrash = create(crashSlice());

const crashEvidence = (at: number): CrashEvidence[] => [
  { k: 'gps', t: at, kmh: 60 }, { k: 'gps', t: at + 1000, kmh: 60 }, { k: 'window', t: at + 2000, peak: 6, stepHz: 0 },
  { k: 'gps', t: at + 3000, kmh: 0 }, { k: 'gps', t: at + 4000, kmh: 0 }, ...Array.from({ length: 11 }, (_, i) => ({ k: 'tick' as const, t: at + 5000 + i * 1000 })),
];

beforeEach(() => useCrash.setState({ enabled: true, phase: 'idle', test: false, deadline: 0 }));

describe('crash store', () => {
  it('starts a countdown when the detector sees a crash', () => {
    for (const e of crashEvidence(0)) useCrash.getState().feed(e);
    expect(useCrash.getState().phase).toBe('countdown');
    expect(useCrash.getState().deadline).toBe(14_000 + COUNTDOWN_MS);
  });

  it('does nothing while the switch is off', () => {
    useCrash.setState({ enabled: false });
    for (const e of crashEvidence(0)) useCrash.getState().feed(e);
    expect(useCrash.getState().phase).toBe('idle');
  });

  it('sends the alert when the countdown runs out, not before', () => {
    useCrash.getState().begin(1000);
    useCrash.getState().tick(1000 + COUNTDOWN_MS - 1);
    expect(useCrash.getState().phase).toBe('countdown');
    useCrash.getState().tick(1000 + COUNTDOWN_MS);
    expect(useCrash.getState().phase).toBe('alerted');
  });

  it('is cancelled by the rider', () => {
    useCrash.getState().begin(0, true);
    useCrash.getState().cancel();
    expect(useCrash.getState().phase).toBe('idle');
    expect(useCrash.getState().test).toBe(false);
  });
});
