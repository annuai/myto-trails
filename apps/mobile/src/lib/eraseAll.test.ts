import { beforeEach, describe, expect, it, vi } from 'vitest';

// Every other store and service is a stub: this test is about what Erase all leaves behind of Home routing.
const wiped = vi.hoisted(() => () => ({ getState: () => ({ wipe: () => {}, clear: () => {}, setEnabled: () => {}, routes: [], checkin: null }), setState: () => {} }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-location', () => ({}));
vi.mock('@/store/persist', async () => {
  const { createJSONStorage } = await import('zustand/middleware');
  const mem = new Map<string, string>();
  return { storage: createJSONStorage(() => ({ getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } })) };
});
vi.mock('@/api/checkins', () => ({ arriveCheckin: async () => {} }));
vi.mock('@/api/sharedRoutes', () => ({ deleteSharedRoute: async () => {} }));
vi.mock('@/api/sync', () => ({ eraseCloudCopy: async () => {} }));
vi.mock('@/store/sync', () => ({ resetSync: () => {} }));
vi.mock('@/lib/motionTraceFile', () => ({ traceDelete: () => {} }));
vi.mock('@/lib/backup/device', () => ({ eraseDocumentPhotos: () => {} }));
vi.mock('@/lib/shareRoute', () => ({ sharedIdOf: (u: string) => u }));
vi.mock('@/lib/signIn', () => ({ signOut: async () => {} }));
vi.mock('@/store/companion', () => ({ useCompanion: wiped() }));
vi.mock('@/store/crash', () => ({ useCrash: wiped() }));
vi.mock('@/fixit/content', () => ({ useFixitCopy: wiped() }));
vi.mock('@/fixit/artCache', () => ({ wipeArt: async () => {} }));
vi.mock('@/store/fixit', () => ({ useFixit: wiped() }));
vi.mock('@/store/fuel', () => ({ useFuel: wiped() }));
vi.mock('@/store/journal', () => ({ useJournal: wiped() }));
vi.mock('@/store/marks', () => ({ useMarks: wiped() }));
vi.mock('@/store/seen', () => ({ useSeen: wiped() }));
vi.mock('@/store/myRoutes', () => ({ useMyRoutes: wiped() }));
vi.mock('@/store/notifications', () => ({ useNotifications: wiped() }));
vi.mock('@/store/profile', () => ({ useProfile: wiped() }));
vi.mock('@/store/region', () => ({ useRegion: wiped() }));
vi.mock('@/store/rides', () => ({ useRides: wiped() }));
vi.mock('@/store/todos', () => ({ useTodos: wiped() }));
vi.mock('@/store/trails', () => ({ useTrailStore: wiped() }));
vi.mock('@/store/trips', () => ({ useTrips: wiped() }));

import { quickPosition, useQuickPos } from '@/features/home/quickPosition';
import { useHomeOffer } from '@/store/homeOffer';
import { usePlaces } from '@/store/places';
import { eraseEverything } from './eraseAll';

describe('eraseEverything', () => {
  beforeEach(() => {
    usePlaces.getState().setPlace('home', { lat: 51.5, lng: -0.12, label: 'Home' }, 1);
    usePlaces.getState().setPlace('work', { lat: 51.6, lng: -0.1, label: 'Office' }, 1);
    usePlaces.getState().addStrike('home');
    useHomeOffer.getState().dismiss(5);
  });

  it('forgets Home, Work and their strikes', () => {
    eraseEverything(null);
    const p = usePlaces.getState();
    expect(p.home).toBeUndefined();
    expect(p.work).toBeUndefined();
    expect(p.endStrikes).toEqual({ home: 0, work: 0 });
  });

  it('forgets the Ride home dismissals', () => {
    eraseEverything(null);
    expect(useHomeOffer.getState().dismissals).toEqual([]);
  });

  it('forgets the last quick position and its 5-minute throttle', async () => {
    await quickPosition(1000, async () => ({ lat: 1, lng: 2, t: 1000 }));
    expect(useQuickPos.getState().lat).toBe(1);
    eraseEverything(null);
    expect(useQuickPos.getState().lat).toBeUndefined();
    // A new reading is allowed straight away, not 5 minutes after the one before the erase.
    expect(await quickPosition(2000, async () => ({ lat: 3, lng: 4, t: 2000 }))).toEqual({ lat: 3, lng: 4, at: 2000 });
  });
});
