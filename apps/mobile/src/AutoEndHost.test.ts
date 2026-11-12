import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const n = vi.hoisted(() => ({ notifyNow: vi.fn(async (_n: { id: string; body: string; route: string }) => {}), dismiss: vi.fn(async (_id: string) => {}), endRide: vi.fn(async () => 'r1' as string | undefined) }));
vi.mock('react-native', () => ({ AppState: { currentState: 'active' } }));
vi.mock('expo-router', () => ({ usePathname: () => '/', useRouter: () => ({ replace: () => {} }) }));
vi.mock('@/lib/notifier', () => ({ notifier: { notifyNow: n.notifyNow, dismiss: n.dismiss }, useTappedRoute: () => null }));
vi.mock('@/features/ride/endRide', () => ({ endRide: n.endRide }));
vi.mock('@/lib/backgroundLocation', () => ({ setRecordingProfile: async () => {} }));
vi.mock('expo-location', () => ({ Accuracy: { Balanced: 3, High: 4, BestForNavigation: 6 } }));
const mk = vi.hoisted(() => async <T extends object>(init: T) => (await import('zustand')).create<T>(() => init));
type Kind = 'home' | 'work';
vi.mock('@/store/places', async () => {
  const s = await mk<{ home?: { lat: number; lng: number; label: string; setAt: number }; work?: unknown; endStrikes: Record<Kind, number>; addStrike: (k: Kind) => void; clearStrikes: (k: Kind) => void }>({ endStrikes: { home: 0, work: 0 }, addStrike: () => {}, clearStrikes: () => {} });
  s.setState({
    addStrike: (k) => s.setState((x) => ({ endStrikes: { ...x.endStrikes, [k]: x.endStrikes[k] + 1 } })),
    clearStrikes: (k) => s.setState((x) => ({ endStrikes: { ...x.endStrikes, [k]: 0 } })),
  });
  return { usePlaces: s };
});
vi.mock('@/store/recorder', async () => ({ useRecorder: await mk({ status: 'idle', paused: false, source: 'gps', startedAt: 0, meters: 0, points: [] as { lat: number; lng: number }[], lastFixAt: 0 }) }));
vi.mock('@/store/motion', async () => ({ useMotion: await mk({ stopped: false }) }));
vi.mock('@/store/companion', async () => ({ useCompanion: await mk({ autoEnd: true, group: null as unknown }) }));
vi.mock('@/store/guideTarget', async () => ({ useGuideTarget: await mk<{ to?: { lat: number; lng: number } }>({}) }));
vi.mock('@/store/trips', async () => ({ useTrips: await mk({ trips: [] as unknown[] }) }));
vi.mock('@/store/myRoutes', async () => ({ useMyRoutes: await mk({ routes: [] as unknown[], followId: undefined as string | undefined }) }));
vi.mock('@/store/trails', async () => ({ useTrailStore: await mk({ nextTrip: undefined as unknown, offline: {} }) }));

import { usePlaces as places } from '@/store/places';
import { useRecorder as rec } from '@/store/recorder';
import { useMotion as motion } from '@/store/motion';
import { useCompanion as companion } from '@/store/companion';
import { useBattery as battery } from '@/store/battery';
import { useAutoEndPrompt, watchAutoEnd } from './AutoEndHost';

const S = 1000;
const FAR = 0.02; // about 2.2 km north of home
const AT_HOME = 0.0005; // about 55 m
let now = 0;
let liveShowing = true;
const replace = vi.fn();
let stop: () => void = () => {};

const fix = (lat: number, t: number) => { now = t; rec.setState((s) => ({ points: [...s.points, { lat, lng: 0 }], lastFixAt: t })); };
const still = (on: boolean, t: number) => { now = t; motion.setState({ stopped: on }); };
const flush = () => new Promise((r) => setTimeout(r, 0));
const warns = () => n.notifyNow.mock.calls.filter(([x]) => x.id === 'auto-end-warn').length;
/** Rides away, comes back home and stands still from `t` + 60 s, sending a fix every 10 s up to `t` + `until`. */
function arriveAndStand(t: number, until: number) {
  fix(FAR, t);
  fix(AT_HOME, t + 60 * S);
  still(true, t + 60 * S);
  for (let x = t + 70 * S; x <= t + until; x += 10 * S) fix(AT_HOME, x);
}

describe('AutoEndHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    n.endRide.mockResolvedValue('r1');
    now = 0; liveShowing = true;
    places.setState({ home: { lat: 0, lng: 0, label: 'Home', setAt: 1 }, work: undefined, endStrikes: { home: 0, work: 0 } });
    motion.setState({ stopped: false });
    companion.setState({ autoEnd: true, group: null });
    rec.setState({ status: 'running', paused: false, source: 'gps', startedAt: 0, meters: 5000, points: [], lastFixAt: 0 });
    stop = watchAutoEnd({ now: () => now, liveShowing: () => liveShowing, replace });
  });
  afterEach(() => stop());

  it('AutoEndHost does nothing when autoEnd is off', async () => {
    companion.setState({ autoEnd: false });
    arriveAndStand(10 * 60 * S, 200 * S);
    await flush();
    expect(n.notifyNow).not.toHaveBeenCalled();
    expect(n.endRide).not.toHaveBeenCalled();
    expect(useAutoEndPrompt.getState().prompt).toBeNull();
  });

  it('a fix sequence that arrives home and stands still produces one warn then one end and one endRide call', async () => {
    const T = 10 * 60 * S;
    arriveAndStand(T, 110 * S);
    expect(warns()).toBe(0);
    fix(AT_HOME, T + 120 * S);
    expect(warns()).toBe(1);
    expect(useAutoEndPrompt.getState().prompt).toMatchObject({ kind: 'home', action: 'warn', text: 'Arrived home. Ending the ride in 30 seconds. Tap to keep recording' });
    fix(AT_HOME, T + 140 * S);
    expect(n.endRide).not.toHaveBeenCalled();
    fix(AT_HOME, T + 150 * S);
    fix(AT_HOME, T + 160 * S);
    fix(AT_HOME, T + 170 * S);
    await flush();
    expect(warns()).toBe(1);
    expect(n.endRide).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/story/r1');
    expect(n.dismiss).toHaveBeenCalledWith('auto-end-warn');
    expect(useAutoEndPrompt.getState().prompt).toBeNull();
  });

  it('tells the rider by notification when the live screen is not showing', async () => {
    liveShowing = false;
    arriveAndStand(10 * 60 * S, 160 * S);
    await flush();
    expect(replace).not.toHaveBeenCalled();
    expect(n.notifyNow).toHaveBeenLastCalledWith(expect.objectContaining({ body: 'Ride saved. Tap to see it', route: '/story/r1' }));
  });

  it('Keep recording after a warn adds a strike, the place is cancelled for this ride and a second arrival there does not warn', async () => {
    const T = 10 * 60 * S;
    arriveAndStand(T, 120 * S);
    expect(warns()).toBe(1);
    useAutoEndPrompt.getState().keep();
    expect(places.getState().endStrikes.home).toBe(1);
    expect(n.dismiss).toHaveBeenCalledWith('auto-end-warn');
    expect(useAutoEndPrompt.getState().prompt).toBeNull();
    fix(AT_HOME, T + 200 * S);
    still(false, T + 210 * S);
    arriveAndStand(T + 300 * S, 300 * S);
    await flush();
    expect(warns()).toBe(1);
    expect(n.endRide).not.toHaveBeenCalled();
  });

  it('removes the warning when the rider rides off', () => {
    const T = 10 * 60 * S;
    arriveAndStand(T, 120 * S);
    expect(warns()).toBe(1);
    still(false, T + 125 * S);
    fix(FAR, T + 130 * S);
    expect(n.dismiss).toHaveBeenCalledWith('auto-end-warn');
    expect(useAutoEndPrompt.getState().prompt).toBeNull();
  });

  it('a completed end clears strikes', async () => {
    places.setState({ endStrikes: { home: 1, work: 0 } });
    arriveAndStand(10 * 60 * S, 160 * S);
    await flush();
    expect(n.endRide).toHaveBeenCalledTimes(1);
    expect(places.getState().endStrikes.home).toBe(0);
  });

  it('the host runs no timers: it reacts only to recorder store changes', async () => {
    stop();
    const interval = vi.spyOn(globalThis, 'setInterval');
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    stop = watchAutoEnd({ now: () => now, liveShowing: () => liveShowing, replace });
    fix(FAR, 10 * 60 * S);
    fix(AT_HOME, 11 * 60 * S);
    still(true, 11 * 60 * S);
    // Time passing without a fix does nothing.
    now = 20 * 60 * S;
    expect(warns()).toBe(0);
    fix(AT_HOME, 20 * 60 * S);
    expect(warns()).toBe(1);
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    interval.mockRestore(); timeout.mockRestore();
    await flush();
  });

  describe('recording profile', () => {
    const setProfile = vi.fn();
    const ride = (kmh: number, t: number) => { now = t; rec.setState((s) => ({ speedKmh: kmh, lastFixAt: t })); };
    beforeEach(() => {
      stop();
      companion.setState({ autoEnd: false, batterySaver: true } as never);
      rec.setState({ backgrounded: true, speedKmh: 0 } as never);
      battery.setState({ level: 80, charging: false });
      stop = watchAutoEnd({ now: () => now, liveShowing: () => liveShowing, replace, setProfile });
    });

    it('goes idle after 2 minutes standing and back to full at 5 km/h at once', () => {
      const T = 10 * 60 * S;
      ride(40, T);
      expect(setProfile).toHaveBeenLastCalledWith('full');
      for (let x = T + 10 * S; x <= T + 120 * S; x += 10 * S) ride(0, x);
      expect(setProfile).toHaveBeenLastCalledWith('full');
      ride(0, T + 130 * S);
      expect(setProfile).toHaveBeenLastCalledWith('idle');
      ride(6, T + 140 * S);
      expect(setProfile).toHaveBeenLastCalledWith('full');
    });

    it('a resume after a pause counts as moving off', () => {
      const T = 10 * 60 * S;
      for (let x = T; x <= T + 130 * S; x += 10 * S) ride(0, x);
      expect(setProfile).toHaveBeenLastCalledWith('idle');
      rec.setState({ paused: true });
      now = T + 400 * S;
      rec.setState({ paused: false });
      expect(setProfile).toHaveBeenLastCalledWith('full');
    });

    it('saver on a low battery, and never anything but full with batterySaver off', () => {
      battery.setState({ level: 15, charging: false });
      ride(40, 10 * 60 * S);
      expect(setProfile).toHaveBeenLastCalledWith('saver');
      companion.setState({ batterySaver: false } as never);
      ride(40, 12 * 60 * S);
      expect(setProfile).toHaveBeenLastCalledWith('full');
      for (let x = 13 * 60 * S; x <= 20 * 60 * S; x += 10 * S) ride(0, x);
      expect(setProfile.mock.calls.every(([p], i) => i === 0 || p === 'full')).toBe(true);
    });

    it('idle wakes on a fix too poor to judge, since it cannot see the rider move', () => {
      const T = 10 * 60 * S;
      for (let x = T; x <= T + 130 * S; x += 10 * S) ride(0, x);
      expect(setProfile).toHaveBeenLastCalledWith('idle');
      now = T + 140 * S;
      rec.setState({ lastFixAt: now, fixPoor: true } as never);
      expect(setProfile).toHaveBeenLastCalledWith('full');
    });

    it('does not ask for a profile when the background task is not recording', () => {
      rec.setState({ backgrounded: false } as never);
      ride(40, 10 * 60 * S);
      expect(setProfile).not.toHaveBeenCalled();
    });
  });
});
