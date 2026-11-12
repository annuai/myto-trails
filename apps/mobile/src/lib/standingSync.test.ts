import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

const h = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { token: 'tok' as string | null, optIn: vi.fn(), upload: vi.fn(), rides: [] as unknown[] };
});
vi.mock('@/api/standing', () => ({ setStandingOptIn: h.optIn, uploadSummaries: h.upload, getCohort: vi.fn() }));
vi.mock('@/store/auth', () => ({ useAuth: { getState: () => ({ token: h.token }) } }));
vi.mock('@/store/rides', () => ({ useRides: { getState: () => ({ rides: h.rides }) } }));
vi.mock('@/store/standingPref', async () => {
  const { standingPrefSlice } = await import('@/store/standingPrefCore');
  return { useStandingPref: create(standingPrefSlice({ now: Date.now, current: () => undefined, fetchCohort: vi.fn() })) };
});

import { ApiFailure } from '@/api/client';
import { useStandingPref } from '@/store/standingPref';
import { chooseStanding, syncStanding } from './standingSync';

const ride = (id: string) => ({ id, name: '', startedAt: new Date(2026, 10, 12, 9).getTime(), durationSec: 60, distanceKm: 5, maxKmh: 1, points: [], waypoints: [{ name: '', lat: 12.5, lng: 77.5 }] });

beforeEach(() => {
  h.token = 'tok'; h.rides = [ride('a')];
  h.optIn.mockReset().mockResolvedValue(undefined); h.upload.mockReset().mockResolvedValue(undefined);
  useStandingPref.getState().reset();
});

describe('standing sync', () => {
  it('signed out: opt-in is stored locally; the first sync after sign-in sends the PUT then uploads', async () => {
    h.token = null;
    await chooseStanding(true);
    expect(useStandingPref.getState().optIn).toBe(true);
    expect(h.optIn).not.toHaveBeenCalled();
    h.token = 'tok';
    await syncStanding();
    expect(h.optIn).toHaveBeenCalledWith('tok', true);
    expect(h.upload).toHaveBeenCalledTimes(1);
    expect(h.optIn.mock.invocationCallOrder[0]).toBeLessThan(h.upload.mock.invocationCallOrder[0]!);
  });
  it('re-sends the opt-in once on 409 not_opted_in, then retries the batch', async () => {
    useStandingPref.getState().set(true); useStandingPref.getState().enqueue(['a']);
    h.upload.mockRejectedValueOnce(new ApiFailure(409, 'not_opted_in', 'x'));
    await syncStanding();
    expect(h.optIn).toHaveBeenCalledTimes(2);
    expect(h.upload).toHaveBeenCalledTimes(2);
    expect(useStandingPref.getState().queue).toEqual([]);
  });
  it('shows an error when the server cannot be reached and clears it on success', async () => {
    useStandingPref.getState().set(true); useStandingPref.getState().enqueue(['a']);
    h.upload.mockRejectedValueOnce(new ApiFailure(0, 'network', 'x'));
    await syncStanding();
    expect(useStandingPref.getState().error).toBeTruthy();
    expect(useStandingPref.getState().queue).toEqual(['a']);
    await syncStanding();
    expect(useStandingPref.getState().error).toBeUndefined();
  });
  it('an offline opt-out is flushed later, and nothing uploads after opt-out', async () => {
    useStandingPref.getState().set(true); useStandingPref.getState().enqueue(['a']);
    h.optIn.mockRejectedValue(new ApiFailure(0, 'network', 'x'));
    await chooseStanding(false);
    expect(useStandingPref.getState()).toMatchObject({ optIn: false, queue: [], pendingOptOut: true });
    h.optIn.mockReset().mockResolvedValue(undefined);
    await syncStanding('a');
    expect(h.optIn).toHaveBeenCalledWith('tok', false);
    expect(useStandingPref.getState().pendingOptOut).toBe(false);
    expect(h.upload).not.toHaveBeenCalled();
  });
  it('reset forgets the choice, the queue, the cohort and a pending opt-out', () => {
    const s = useStandingPref.getState();
    s.set(true); s.enqueue(['a']); s.set(false); s.set(true); s.enqueue(['b']);
    s.reset();
    expect(useStandingPref.getState()).toMatchObject({ optIn: false, queue: [], cohort: undefined, pendingOptOut: false });
  });
});
