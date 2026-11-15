import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { alarmsSlice } from './alarmsCore';

const DAY = 86_400_000;
const make = () => create(alarmsSlice());

describe('alarms store', () => {
  it('sets, replaces and removes an alarm', () => {
    const s = make();
    s.getState().set({ key: 'trip:t1', kind: 'trip', refId: 't1', leadMin: 15, goal: 'auto' });
    s.getState().set({ key: 'trip:t1', kind: 'trip', refId: 't1', leadMin: 30, goal: 'auto' });
    expect(s.getState().settings['trip:t1'].leadMin).toBe(30);
    s.getState().remove('trip:t1');
    expect(s.getState().settings).toEqual({});
  });

  it('keeps the first wake-up time and forgets old ones and past club rides', () => {
    const s = make();
    s.getState().markWoke('g', 100);
    s.getState().markWoke('g', 200);
    expect(s.getState().woke.g).toBe(100);
    s.getState().set({ key: 'event:e', kind: 'event', refId: 'e', leadMin: 15, goal: 'start', startsAt: 0 });
    s.getState().set({ key: 'trip:t', kind: 'trip', refId: 't', leadMin: 15, goal: 'start' });
    s.getState().prune(11 * DAY);
    expect(s.getState().woke).toEqual({});
    expect(Object.keys(s.getState().settings)).toEqual(['trip:t']);
  });
});
