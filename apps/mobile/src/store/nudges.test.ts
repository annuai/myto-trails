import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { nudgesSlice } from './nudgesCore';
import type { Nudge } from '@/lib/nudge/types';

const nudge = (id: string, fireAt: number): Nudge => ({ id, type: 'weekend', fireAt, title: 't', body: 'b', lock: 'l', route: '/', score: 1 });
const store = () => create(nudgesSlice());

describe('nudges store', () => {
  it('starts with no choice made, and remembers the first time it was seen once', () => {
    const s = store();
    expect(s.getState().level).toBeUndefined();
    s.getState().seenFirst(100); s.getState().seenFirst(200);
    expect(s.getState().firstSeenAt).toBe(100);
  });
  it('mutes and unmutes a kind', () => {
    const s = store();
    s.getState().setMuted('weather', true); s.getState().setMuted('weather', true); s.getState().setMuted('club', true);
    expect(s.getState().muted).toEqual(['weather', 'club']);
    s.getState().setMuted('weather', false);
    expect(s.getState().muted).toEqual(['club']);
  });
  it('writes a planned nudge into the history once its time has come, and keeps the ones still ahead', () => {
    const s = store();
    s.getState().setPlanned([nudge('a', 1000), nudge('b', 9000)]);
    s.getState().absorb(5000);
    expect(s.getState().history.map((h) => h.id)).toEqual(['a']);
    expect(s.getState().planned.map((p) => p.id)).toEqual(['b']);
    s.getState().absorb(5000);
    expect(s.getState().history).toHaveLength(1);
  });
  it('records a tap whether the nudge has already come due or not yet been written to the history', () => {
    const s = store();
    s.getState().setPlanned([nudge('a', 1000), nudge('b', 2000)]);
    s.getState().markTapped('a', 1500);
    s.getState().absorb(3000);
    expect(s.getState().history.find((h) => h.id === 'a')?.opened).toBe(1500);
    s.getState().markTapped('b', 3500);
    expect(s.getState().history.find((h) => h.id === 'b')?.opened).toBe(3500);
  });
  it('caps the history', () => {
    const s = store();
    s.getState().setPlanned(Array.from({ length: 120 }, (_, i) => nudge(`n${i}`, i + 1)));
    s.getState().absorb(1000);
    expect(s.getState().history).toHaveLength(80);
    expect(s.getState().history[79]!.id).toBe('n119');
  });
  it('wipes everything', () => {
    const s = store();
    s.getState().setLevel('regular'); s.getState().setMuted('club', true);
    s.getState().wipe();
    expect(s.getState().level).toBeUndefined();
    expect(s.getState().muted).toEqual([]);
  });
});
