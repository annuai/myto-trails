import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';

// The phone's storage is not available here; keep the state in memory.
const mem = vi.hoisted(() => new Map<string, string>());
vi.mock('./persist', () => ({ storage: undefined }));
import { mergeCompanion, useCompanion } from './companion';

beforeEach(() => useCompanion.getState().wipe());

describe('companion card', () => {
  it('starts with the bar layout and light ink', () => {
    expect(useCompanion.getState().card).toMatchObject({ format: 'story', layout: 'bar', ink: 'light' });
  });
  it('setCard({ format, stats }) keeps the remembered layout and ink', () => {
    useCompanion.getState().setCard({ layout: 'corner', ink: 'dark' });
    useCompanion.getState().setCard({ format: 'post', stats: ['time'] });
    expect(useCompanion.getState().card).toEqual({ format: 'post', stats: ['time'], layout: 'corner', ink: 'dark' });
  });
  it('wipe restores the defaults', () => {
    useCompanion.getState().setCard({ layout: 'corner', ink: 'dark', format: 'square' });
    useCompanion.getState().wipe();
    expect(useCompanion.getState().card).toMatchObject({ format: 'story', layout: 'bar', ink: 'light' });
  });
  it('a card saved by an older build rehydrates with the defaults', () => {
    const out = mergeCompanion({ card: { format: 'post', stats: ['time'] } }, useCompanion.getState());
    expect(out.card).toEqual({ format: 'post', stats: ['time'], layout: 'bar', ink: 'light' });
  });
  it('a saved card with a layout and ink keeps them', () => {
    const out = mergeCompanion({ card: { format: 'story', stats: [], layout: 'corner', ink: 'dark' } }, useCompanion.getState());
    expect(out.card).toMatchObject({ layout: 'corner', ink: 'dark' });
  });
  const DEFAULTS = { format: 'story', stats: ['distance', 'time', 'topSpeed'], layout: 'bar', ink: 'light' };
  const merged = (saved: unknown) => mergeCompanion(saved, useCompanion.getState());
  it.each([[undefined], [null], ['abc'], [[]], [42]])('a saved card of %j falls back to the defaults', (card) => {
    expect(merged({ card }).card).toEqual(DEFAULTS);
  });
  it('an unknown layout keeps a valid format', () => {
    expect(merged({ card: { format: 'square', stats: ['time'], layout: 'wide', ink: 'dark' } }).card).toEqual({ format: 'square', stats: ['time'], layout: 'bar', ink: 'dark' });
  });
  it('an unknown format keeps valid stats', () => {
    expect(merged({ card: { format: 'banner', stats: ['elevation'], layout: 'corner', ink: 'light' } }).card).toEqual({ format: 'story', stats: ['elevation'], layout: 'corner', ink: 'light' });
    expect(merged({ card: { format: 'toString', stats: ['time'] } }).card.format).toBe('story');
  });
  it('drops unknown stats, and falls back when none are left or stats is not an array', () => {
    expect(merged({ card: { stats: ['time', 'bogus', 7] } }).card.stats).toEqual(['time']);
    expect(merged({ card: { stats: ['bogus'] } }).card.stats).toEqual(DEFAULTS.stats);
    expect(merged({ card: { stats: 'time' } }).card.stats).toEqual(DEFAULTS.stats);
  });
  it('a non-object saved state gives the current state, without junk keys', () => {
    for (const bad of [undefined, null, 'x', [1], 5]) expect(merged(bad)).toBe(useCompanion.getState());
  });
  it('other saved slices survive the merge', () => {
    const checkin = { id: 'c', expectedAt: 1, contactName: 'A', url: 'u' };
    const out = merged({ checkin, outbox: [{ x: 1 }], autoPause: true, autoEnd: true, batterySaver: false, card: { format: 'post' } });
    expect(out).toMatchObject({ checkin, outbox: [{ x: 1 }], autoPause: true, autoEnd: true, batterySaver: false });
    expect(out.card.format).toBe('post');
  });
  it('is wired as the persist merge: an old card in storage loads with the defaults', async () => {
    vi.resetModules();
    vi.doMock('./persist', () => ({ storage: createJSONStorage(() => ({ getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) })) }));
    mem.set('myto-companion', JSON.stringify({ state: { card: { format: 'post', stats: ['time'] } }, version: 0 }));
    const { useCompanion: fresh } = await import('./companion');
    expect(fresh.getState().card).toEqual({ format: 'post', stats: ['time'], layout: 'bar', ink: 'light' });
  });
});
