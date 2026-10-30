import { describe, expect, it, vi } from 'vitest';
import type { LatLng } from './geo';
import { createMemoryJournal } from './journal';
import { createFinisher } from './finishCore';

const M = 1 / 111_320;
const T0 = 1_700_000_000_000;
const pt = (north: number, tSec: number): LatLng => ({ lat: 13 + north * M, lng: 77.6, t: T0 + tSec * 1000 });

async function setup(opts: { persist?: () => Promise<void>; existing?: string; fixes?: LatLng[]; rideId?: string } = {}) {
  const journal = createMemoryJournal();
  await journal.begin({ startedAt: T0, source: 'gps', ...(opts.rideId ? { rideId: opts.rideId } : {}) });
  for (const f of opts.fixes ?? [pt(0, 0), pt(100, 10), pt(200, 20)]) await journal.append(f);
  const calls: string[] = [];
  const addRide = vi.fn((_r: unknown, _id?: string) => { calls.push('add'); return 'ride-1'; });
  const deps = {
    journal, addRide,
    stopBackground: vi.fn(async () => { calls.push('stop'); }),
    flush: vi.fn(async () => { calls.push('flush'); }),
    reset: vi.fn(),
    findSaved: vi.fn(() => opts.existing),
    persist: vi.fn(opts.persist ?? (async () => { calls.push('persist'); })),
    now: () => T0 + 60_000,
  };
  return { journal, deps, calls, finish: createFinisher(deps), addRide };
}

describe('finishing a ride', () => {
  it('stops recording and drains pending writes before reading the journal, and clears it only after the ride is persisted', async () => {
    const { finish, calls, journal } = await setup();
    expect(await finish()).toBe('ride-1');
    expect(calls).toEqual(['stop', 'flush', 'add', 'persist']);
    expect(await journal.read()).toBeNull();
  });
  it('a double tap saves one ride', async () => {
    const { finish, addRide } = await setup();
    const [a, b] = await Promise.all([finish(), finish()]);
    expect(a).toBe('ride-1');
    expect(b).toBe('ride-1');
    expect(addRide).toHaveBeenCalledTimes(1);
  });
  it('keeps the journal when the ride could not be written, so nothing is lost and the ride can be recovered', async () => {
    const { finish, journal } = await setup({ persist: async () => { throw new Error('storage full'); } });
    await expect(finish()).rejects.toThrow('storage full');
    expect(await journal.read()).not.toBeNull();
  });
  it('does not save a second copy of a ride that is already saved, and still clears the journal', async () => {
    const { finish, addRide, journal } = await setup({ existing: 'ride-0' });
    expect(await finish()).toBe('ride-0');
    expect(addRide).not.toHaveBeenCalled();
    expect(await journal.read()).toBeNull();
  });
  it('saves nothing for a ride with fewer than two usable points, and clears the journal', async () => {
    const { finish, addRide, journal } = await setup({ fixes: [pt(0, 0)] });
    expect(await finish()).toBeUndefined();
    expect(addRide).not.toHaveBeenCalled();
    expect(await journal.read()).toBeNull();
  });
  it('can finish again after a failure', async () => {
    let fail = true;
    const { finish } = await setup({ persist: async () => { if (fail) throw new Error('x'); } });
    await expect(finish()).rejects.toThrow();
    fail = false;
    expect(await finish()).toBe('ride-1');
  });

  it('saves the ride under the id it was given when it started', async () => {
    const { finish, addRide } = await setup({ rideId: 'ride-abc' });
    await finish();
    expect(addRide).toHaveBeenCalledWith(expect.objectContaining({ startedAt: T0 }), 'ride-abc');
  });
  it('a recording from before ride ids still saves, with no id given', async () => {
    const { finish, addRide } = await setup();
    await finish();
    expect(addRide).toHaveBeenCalledWith(expect.objectContaining({ startedAt: T0 }), undefined);
  });
});
