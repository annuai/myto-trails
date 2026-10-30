import { describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import type { JournalEntry } from '@/lib/journalEntries';
import { journalSlice } from './journalCore';

const entry = (id: string, rideKey: number, kind: JournalEntry['kind']): JournalEntry => ({ id, rideKey, at: 1, kind });
const setup = (rideIdFor?: (rideKey: number) => string | undefined, whereNow?: () => { lat: number; lng: number } | undefined) => {
  const media = { remove: vi.fn(), removeAll: vi.fn() };
  return { media, store: create(journalSlice(media, rideIdFor, whereNow)) };
};

describe('journal store', () => {
  it('adds entries', () => {
    const { store } = setup();
    store.getState().add(entry('a', 1, 'note'));
    expect(store.getState().entries).toHaveLength(1);
  });
  it('removing an entry deletes its file, but a note has none', () => {
    const { store, media } = setup();
    store.getState().add(entry('a', 1, 'photo'));
    store.getState().add(entry('b', 1, 'note'));
    store.getState().remove('a');
    store.getState().remove('b');
    expect(media.remove).toHaveBeenCalledTimes(1);
    expect(media.remove).toHaveBeenCalledWith('a', 'photo');
    expect(store.getState().entries).toEqual([]);
  });
  it('removeForRide deletes that ride\'s entries and files and keeps other rides', () => {
    const { store, media } = setup();
    store.getState().add(entry('a', 1, 'voice'));
    store.getState().add(entry('b', 1, 'photo'));
    store.getState().add(entry('c', 2, 'photo'));
    store.getState().removeForRide(1);
    expect(store.getState().entries.map((x) => x.id)).toEqual(['c']);
    expect(media.remove).toHaveBeenCalledWith('a', 'voice');
    expect(media.remove).toHaveBeenCalledWith('b', 'photo');
    expect(media.remove).not.toHaveBeenCalledWith('c', 'photo');
  });
  it('wipe removes everything including every file', () => {
    const { store, media } = setup();
    store.getState().add(entry('a', 1, 'photo'));
    store.getState().wipe();
    expect(store.getState().entries).toEqual([]);
    expect(media.removeAll).toHaveBeenCalledTimes(1);
  });
  it('restore replaces the entries without touching files', () => {
    const { store, media } = setup();
    store.getState().add(entry('a', 1, 'photo'));
    store.getState().restore([entry('z', 9, 'note')]);
    expect(store.getState().entries.map((x) => x.id)).toEqual(['z']);
    expect(media.remove).not.toHaveBeenCalled();
  });
  it('rename gives a journal its own title, trimmed, and an empty title takes it away', () => {
    const { store } = setup();
    store.getState().rename(5, '  Tea at Nandi  ');
    expect(store.getState().titles[5]).toBe('Tea at Nandi');
    store.getState().rename(5, '   ');
    expect(store.getState().titles[5]).toBeUndefined();
  });
  it('removeForRide and wipe drop the titles too', () => {
    const { store } = setup();
    store.getState().rename(1, 'One');
    store.getState().rename(2, 'Two');
    store.getState().removeForRide(1);
    expect(store.getState().titles).toEqual({ 2: 'Two' });
    store.getState().wipe();
    expect(store.getState().titles).toEqual({});
  });
  it('restore replaces entries and titles, and a backup with no titles clears them', () => {
    const { store } = setup();
    store.getState().rename(1, 'Old');
    store.getState().restore([entry('a', 7, 'note')], { 7: 'New' });
    expect(store.getState().titles).toEqual({ 7: 'New' });
    store.getState().restore([]);
    expect(store.getState().titles).toEqual({});
  });

  it('stamps the id of the ride an entry belongs to, when it is known', () => {
    const { store } = setup((k) => (k === 100 ? 'ride-x' : undefined));
    store.getState().add(entry('a', 100, 'note'));
    store.getState().add(entry('b', 200, 'note'));
    store.getState().add({ ...entry('c', 100, 'note'), rideId: 'already' });
    const by = Object.fromEntries(store.getState().entries.map((e) => [e.id, e.rideId]));
    expect(by).toEqual({ a: 'ride-x', b: undefined, c: 'already' });
  });
  it('fills in the ride id of older entries from the saved rides, once, and keeps everything else', () => {
    const { store } = setup();
    store.getState().restore([entry('a', 100, 'note'), entry('b', 100, 'photo'), entry('c', 999, 'note'), { ...entry('d', 100, 'note'), rideId: 'keep' }], { 100: 'Title' });
    expect(store.getState().backfillRideIds([{ id: 'ride-x', startedAt: 100 }])).toBe(2);
    expect(store.getState().entries.map((e) => e.rideId)).toEqual(['ride-x', 'ride-x', undefined, 'keep']);
    expect(store.getState().titles).toEqual({ 100: 'Title' });
    expect(store.getState().backfillRideIds([{ id: 'ride-x', startedAt: 100 }])).toBe(0);
  });

  it('notes where a moment was made when the phone knows, and never overwrites a place it was given', () => {
    const { store } = setup(undefined, () => ({ lat: 13, lng: 77 }));
    store.getState().add(entry('a', 1, 'note'));
    store.getState().add({ ...entry('b', 1, 'note'), lat: 1, lng: 2 });
    const by = Object.fromEntries(store.getState().entries.map((e) => [e.id, [e.lat, e.lng]]));
    expect(by).toEqual({ a: [13, 77], b: [1, 2] });
  });
  it('adds no place when the phone does not know where it is', () => {
    const { store } = setup(undefined, () => undefined);
    store.getState().add(entry('a', 1, 'note'));
    expect(store.getState().entries[0]).not.toHaveProperty('lat');
  });
});
