import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-location', () => ({ Accuracy: { Balanced: 3 } }));
const acquire = vi.hoisted(() => vi.fn());
vi.mock('@/store/location', async () => ({ useLocation: (await import('zustand')).create(() => ({ acquire })) }));

import { POSITION_EVERY_MS, quickPosition, quickPos, resetQuickPosition } from './quickPosition';

const fix = { lat: 1, lng: 2, t: 5 };

describe('quickPosition', () => {
  beforeEach(() => { resetQuickPosition(); acquire.mockClear(); });
  it('reads once, then not again within 5 minutes, then again after', async () => {
    const read = vi.fn(async () => fix);
    expect(POSITION_EVERY_MS).toBe(5 * 60_000);
    expect(await quickPosition(1_000, read)).toEqual({ lat: 1, lng: 2, at: 1_000 });
    expect(await quickPosition(1_000 + POSITION_EVERY_MS - 1, read)).toBeUndefined();
    expect(read).toHaveBeenCalledTimes(1);
    await quickPosition(1_000 + POSITION_EVERY_MS, read);
    expect(read).toHaveBeenCalledTimes(2);
    expect(quickPos().at).toBe(1_000 + POSITION_EVERY_MS);
  });
  it('counts a failed or denied read as an attempt, and never acquires the GPS watch', async () => {
    const read = vi.fn(async () => undefined);
    await quickPosition(10, read);
    await quickPosition(20, read);
    expect(read).toHaveBeenCalledTimes(1);
    expect(acquire).not.toHaveBeenCalled();
  });
  it('does not read twice at once', async () => {
    let done: (f: typeof fix) => void = () => undefined;
    const read = vi.fn(() => new Promise<typeof fix>((r) => { done = r; }));
    const a = quickPosition(1, read);
    const b = await quickPosition(2, read);
    expect(b).toBeUndefined();
    done(fix);
    await a;
    expect(read).toHaveBeenCalledTimes(1);
  });
});
