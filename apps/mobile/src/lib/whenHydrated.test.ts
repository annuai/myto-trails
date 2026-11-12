import { describe, expect, it, vi } from 'vitest';
import { fakeStore } from './testHydration';
import { whenHydrated } from './whenHydrated';

describe('whenHydrated', () => {
  it('runs at once when every store is already loaded', () => {
    const run = vi.fn();
    whenHydrated([fakeStore(true), fakeStore(true)], run);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('waits for the last store, then runs exactly once and stops listening', () => {
    const a = fakeStore(); const b = fakeStore(); const run = vi.fn();
    whenHydrated([a, b], run);
    a.finish();
    expect(run).not.toHaveBeenCalled();
    b.finish();
    expect(run).toHaveBeenCalledTimes(1);
    a.finish(); b.finish();
    expect(run).toHaveBeenCalledTimes(1);
    expect(a.listeners() + b.listeners()).toBe(0);
  });
  it('never runs once cancelled', () => {
    const a = fakeStore(); const run = vi.fn();
    const off = whenHydrated([a], run);
    off();
    a.finish();
    expect(run).not.toHaveBeenCalled();
  });
});
