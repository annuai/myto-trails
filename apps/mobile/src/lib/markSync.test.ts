import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/persist', () => ({ storage: undefined }));

import { syncMarks } from './markSync';
import { useMarks } from '@/store/marks';
import { useRides } from '@/store/rides';
import { useStory } from '@/store/story';

const ride = (i: number, over = {}) => ({ id: `r${i}`, name: 'r', startedAt: new Date(2026, i, 10, 10).getTime(), durationSec: 600, distanceKm: 20, maxKmh: 60, points: [], ...over });
const setRides = (rides: unknown[]) => useRides.setState({ rides } as never);

beforeEach(() => { useMarks.getState().wipe(); useStory.getState().wipe(); setRides([]); });

describe('syncMarks', () => {
  it('does not announce the title an upgrading rider already holds', () => {
    useMarks.setState({ seeded: true, held: { 'first-ride': 1 } });
    setRides([ride(0)]);
    syncMarks('ride-end');
    expect(useStory.getState().title).toBe('day-tripper');
    expect(useStory.getState().latest).toBeNull();
    expect(useStory.getState().pending).toEqual([]);
  });
  it('announces the title a new rider reaches after the first ride', () => {
    syncMarks();
    setRides([ride(0)]);
    syncMarks('ride-end');
    const titles = [useStory.getState().latest?.moment.title, ...useStory.getState().pending.map((m) => m.title)];
    expect(titles).toContain('You are a Day-tripper now.');
    expect(useStory.getState().latest?.moment.title).toBe('You are a Day-tripper now.');
  });
  it('shows one of two marks earned together now and the other in a later session', () => {
    syncMarks();
    setRides([ride(0, { distanceKm: 120 })]); // title, first ride, 100 km
    syncMarks('ride-end');
    const first = useStory.getState().latest!.moment.id;
    expect(useStory.getState().pending.length).toBe(2);
    useStory.setState({ shownThisSession: [] }); // a new session
    syncMarks('dash');
    expect(useStory.getState().latest!.moment.id).not.toBe(first);
    expect(useStory.getState().pending.length).toBe(1);
  });
});
