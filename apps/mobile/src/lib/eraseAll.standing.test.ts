import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ calls: [] as string[] }));
// Every store and helper eraseEverything touches is stubbed; only the order of the sign-out call matters here.
const state = () => new Proxy({}, { get: (_t, k) => (k === 'routes' ? [] : k === 'checkin' ? undefined : () => undefined) });
const stub = () => ({ getState: state, setState: () => undefined });
for (const m of ['companion', 'crash', 'fixit', 'fuel', 'journal', 'marks', 'seen', 'story', 'myRoutes', 'notifications', 'pillion', 'profile', 'region', 'rides', 'todos', 'trails', 'trips']) {
  vi.doMock(`@/store/${m}`, () => new Proxy({}, { get: () => stub(), has: () => true }));
}
vi.mock('@/features/home/quickPosition', () => ({ resetQuickPosition: vi.fn() }));
vi.mock('@/store/places', () => ({ usePlaces: { setState: () => undefined, getState: () => ({}) } }));
vi.mock('@/store/homeOffer', () => ({ useHomeOffer: { getState: () => ({ clear: () => undefined }) } }));
vi.mock('@/api/checkins', () => ({ arriveCheckin: vi.fn() }));
vi.mock('@/api/sharedRoutes', () => ({ deleteSharedRoute: vi.fn() }));
vi.mock('@/api/sync', () => ({ eraseCloudCopy: async () => {} }));
vi.mock('@/store/sync', () => ({ resetSync: () => {} }));
vi.mock('@/lib/motionTraceFile', () => ({ traceDelete: vi.fn() }));
vi.mock('@/lib/backup/device', () => ({ eraseDocumentPhotos: vi.fn() }));
vi.mock('@/lib/shareRoute', () => ({ sharedIdOf: vi.fn() }));
vi.mock('@/fixit/content', () => ({ useFixitCopy: { getState: () => ({ clear: vi.fn() }) } }));
vi.mock('@/fixit/artCache', () => ({ wipeArt: vi.fn(async () => undefined) }));
vi.mock('@/lib/signIn', () => ({ signOut: vi.fn(async () => { h.calls.push('signOut'); }) }));

describe('eraseEverything', () => {
  it('leaves the standing opt-out to signOut, which sends it before revoking the token', async () => {
    const { eraseEverything } = await import('./eraseAll');
    eraseEverything('tok');
    expect(h.calls).toEqual(['signOut']);
  });
});
