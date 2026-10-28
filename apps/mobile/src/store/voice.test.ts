import { describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from '@/lib/journalEntries';
import { UserFacingError, createVoice } from './voiceCore';

function setup(over: { start?: () => Promise<void>; stop?: () => Promise<string | undefined>; save?: (uri: string, id: string) => Promise<void> } = {}) {
  const added: JournalEntry[] = [];
  let now = 1_700_000_000_000;
  const store = createVoice({ add: (e) => added.push(e), save: over.save ?? (async () => undefined), now: () => now });
  store.getState().attach({ start: over.start ?? (async () => undefined), stop: over.stop ?? (async () => 'file:///rec.m4a') });
  return { store, added, advance: (ms: number) => { now += ms; } };
}

describe('voice notes', () => {
  it('tap starts, tap again stops and saves an entry on the ride it was started for, with its length', async () => {
    const { store, added, advance } = setup();
    await store.getState().toggle(100);
    expect(store.getState().recording).toBe(true);
    advance(12_400);
    await store.getState().toggle(999);
    expect(store.getState().recording).toBe(false);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ rideKey: 100, kind: 'voice', durationSec: 12 });
  });
  it('a second tap while the first stop is still saving does nothing', async () => {
    let release = () => {};
    const slowSave = () => new Promise<void>((r) => { release = r; });
    const { store, added } = setup({ save: slowSave });
    await store.getState().toggle(1);
    const first = store.getState().toggle(1);
    await new Promise((r) => setTimeout(r, 0));
    await store.getState().toggle(1);
    release();
    await first;
    expect(added).toHaveLength(1);
    expect(store.getState().recording).toBe(false);
  });
  it('a failed start leaves it not recording and says why', async () => {
    const { store } = setup({ start: async () => { throw new UserFacingError('The microphone is turned off for Myto.'); } });
    await store.getState().toggle(1);
    expect(store.getState().recording).toBe(false);
    expect(store.getState().error).toBe('The microphone is turned off for Myto.');
  });
  it('an unexpected start failure gives a general message', async () => {
    const { store } = setup({ start: async () => { throw new Error('native crash'); } });
    await store.getState().toggle(1);
    expect(store.getState().error).toBe('Could not start recording.');
  });
  it('a failed save adds no entry and says so', async () => {
    const { store, added } = setup({ save: async () => { throw new Error('disk full'); } });
    await store.getState().toggle(1);
    await store.getState().toggle(1);
    expect(added).toHaveLength(0);
    expect(store.getState().recording).toBe(false);
    expect(store.getState().error).toBe('Could not save the voice note.');
  });
  it('a recording with no file adds no entry', async () => {
    const { store, added } = setup({ stop: async () => undefined });
    await store.getState().toggle(1);
    await store.getState().toggle(1);
    expect(added).toHaveLength(0);
  });
  it('says so when no recorder is available', async () => {
    const store = createVoice({ add: vi.fn(), save: async () => undefined, now: () => 0 });
    await store.getState().toggle(1);
    expect(store.getState().recording).toBe(false);
    expect(store.getState().error).toBe('Could not start recording.');
  });
});
