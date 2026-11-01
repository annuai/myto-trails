import { beforeEach, describe, expect, it } from 'vitest';
import { COUNTDOWN_MS } from '@/lib/crashAlert';
import { create } from 'zustand';
import type { CrashEvidence } from '@/lib/crashDetect';
import { createJSONStorage, persist } from 'zustand/middleware';
import { crashPartialize, crashSlice, type CrashStore } from './crashCore';

const useCrash = create(crashSlice());

const crashEvidence = (at: number): CrashEvidence[] => [
  { k: 'gps', t: at, kmh: 60 }, { k: 'gps', t: at + 1000, kmh: 60 }, { k: 'window', t: at + 2000, peak: 6, stepHz: 0 },
  { k: 'gps', t: at + 3000, kmh: 0 }, { k: 'gps', t: at + 4000, kmh: 0 }, ...Array.from({ length: 11 }, (_, i) => ({ k: 'tick' as const, t: at + 5000 + i * 1000 })),
];

beforeEach(() => useCrash.setState({ enabled: true, preset: 'mixed', phase: 'idle', test: false, deadline: 0 }));

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

  it('changes how hard an impact must be with the preset', () => {
    const ev = (at: number): CrashEvidence[] => crashEvidence(at).map((e) => (e.k === 'window' ? { ...e, peak: 3.5 } : e));
    for (const e of ev(0)) useCrash.getState().feed(e);
    expect(useCrash.getState().phase).toBe('idle');
    useCrash.getState().setPreset('road');
    expect(useCrash.getState().preset).toBe('road');
    for (const e of ev(100_000)) useCrash.getState().feed(e);
    expect(useCrash.getState().phase).toBe('countdown');
  });

  describe('persistence', () => {
    const make = (stored?: object) => {
      const mem = new Map<string, string>();
      if (stored) mem.set('t', JSON.stringify({ state: stored, version: 0 }));
      const store = create<CrashStore>()(persist(crashSlice(), {
        name: 't', partialize: crashPartialize,
        storage: createJSONStorage(() => ({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) })),
      }));
      return { store, mem };
    };

    it('keeps the preset along with the switch', () => {
      const { store, mem } = make();
      store.getState().setPreset('offroad');
      expect(JSON.parse(mem.get('t')!).state).toEqual({ enabled: false, preset: 'offroad' });
    });

    it('restores a stored preset', () => {
      expect(make({ enabled: true, preset: 'road' }).store.getState().preset).toBe('road');
    });

    it('defaults to mixed for an older install with no preset', () => {
      const { store } = make({ enabled: true });
      expect(store.getState().enabled).toBe(true);
      expect(store.getState().preset).toBe('mixed');
    });
  });
});
