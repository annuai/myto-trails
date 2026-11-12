import { beforeEach, describe, expect, it, vi } from 'vitest';

const L = vi.hoisted(() => ({
  running: false,
  startLocationUpdatesAsync: vi.fn(async (_name: string, _o: Record<string, unknown>) => { L.running = true; }),
  stopLocationUpdatesAsync: vi.fn(async (_name: string) => { L.running = false; }),
  hasStartedLocationUpdatesAsync: vi.fn(async (_name: string) => L.running),
  getBackgroundPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
}));
vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4, BestForNavigation: 6 },
  ActivityType: { AutomotiveNavigation: 2 },
  startLocationUpdatesAsync: L.startLocationUpdatesAsync,
  stopLocationUpdatesAsync: L.stopLocationUpdatesAsync,
  hasStartedLocationUpdatesAsync: L.hasStartedLocationUpdatesAsync,
  getBackgroundPermissionsAsync: L.getBackgroundPermissionsAsync,
}));
vi.mock('expo-task-manager', () => ({ defineTask: () => {} }));
vi.mock('@/store/recorder', () => ({ useRecorder: { getState: () => ({ ingest: async () => {} }) } }));

import { setRecordingProfile, startBackground, stopBackground } from './backgroundLocation';

const lastOptions = () => L.startLocationUpdatesAsync.mock.calls.at(-1)?.[1];

describe('backgroundLocation', () => {
  beforeEach(async () => {
    await stopBackground();
    vi.clearAllMocks();
    L.running = false;
  });

  it("full options equal today's call (BestForNavigation, 1000, distanceInterval 0, AutomotiveNavigation)", async () => {
    expect(await startBackground()).toBe(true);
    expect(lastOptions()).toEqual({
      accuracy: 6, distanceInterval: 0, timeInterval: 1000,
      pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true, activityType: 2,
      foregroundService: { notificationTitle: 'Location is on', notificationBody: 'Myto Moto uses it to record your ride.' },
    });
  });

  it('setRecordingProfile restarts updates with the saver options and does nothing when the profile is already running', async () => {
    await startBackground();
    L.startLocationUpdatesAsync.mockClear();
    await setRecordingProfile('full');
    expect(L.startLocationUpdatesAsync).not.toHaveBeenCalled();
    await setRecordingProfile('saver');
    expect(L.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(lastOptions()).toMatchObject({ accuracy: 4, timeInterval: 3000, distanceInterval: 0, activityType: 2, pausesUpdatesAutomatically: false });
    // Options are changed on the running task: recording is never stopped to switch.
    expect(L.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    await setRecordingProfile('saver');
    expect(L.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('does not switch when recording is not running, and a new ride starts at full', async () => {
    await setRecordingProfile('idle');
    expect(L.startLocationUpdatesAsync).not.toHaveBeenCalled();
    await startBackground();
    await setRecordingProfile('idle');
    await stopBackground();
    await startBackground();
    expect(lastOptions()).toMatchObject({ accuracy: 6, timeInterval: 1000 });
  });

  it('applies the first profile asked for to a task left running from before a relaunch', async () => {
    L.running = true;
    expect(await startBackground()).toBe(true);
    expect(L.startLocationUpdatesAsync).not.toHaveBeenCalled();
    await setRecordingProfile('full');
    expect(lastOptions()).toMatchObject({ accuracy: 6, timeInterval: 1000 });
    await setRecordingProfile('full');
    expect(L.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('a failed switch leaves the running profile, and restarts it if the task stopped', async () => {
    await startBackground();
    L.startLocationUpdatesAsync.mockImplementationOnce(async () => { L.running = false; throw new Error('no'); });
    await setRecordingProfile('idle');
    expect(L.running).toBe(true);
    expect(lastOptions()).toMatchObject({ accuracy: 6, timeInterval: 1000 });
    // Still on full: asking for full again does nothing, asking for idle tries again.
    L.startLocationUpdatesAsync.mockClear();
    await setRecordingProfile('full');
    expect(L.startLocationUpdatesAsync).not.toHaveBeenCalled();
    await setRecordingProfile('idle');
    expect(lastOptions()).toMatchObject({ accuracy: 3, timeInterval: 10_000 });
  });
});
