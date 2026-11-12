import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

const h = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  return { calls: [] as string[], optIn: vi.fn(), revoke: vi.fn() };
});
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-crypto', () => ({}));
vi.mock('expo-linking', () => ({}));
vi.mock('expo-secure-store', () => ({}));
vi.mock('@/api/client', () => ({ api: h.revoke, ApiFailure: class extends Error {} }));
vi.mock('@/api/standing', () => ({ setStandingOptIn: h.optIn, uploadSummaries: vi.fn() }));
vi.mock('@/api/useApi', () => ({ forgetProfile: vi.fn() }));
vi.mock('@/lib/imageCache', () => ({ wipeImageCache: vi.fn(async () => undefined) }));
vi.mock('@/store/submissionQueue', () => ({ useSubmissionQueue: { getState: () => ({ setItems: vi.fn() }) } }));
vi.mock('@/store/rides', () => ({ useRides: { getState: () => ({ rides: [] }) } }));
vi.mock('@/store/auth', () => ({ useAuth: { getState: () => ({ token: 'tok', clear: vi.fn() }) } }));
vi.mock('@/store/standingPref', async () => {
  const { standingPrefSlice } = await import('@/store/standingPrefCore');
  return { useStandingPref: create(standingPrefSlice({ now: Date.now, current: () => undefined, fetchCohort: vi.fn() })) };
});

import { useStandingPref } from '@/store/standingPref';
import { signOut } from './signIn';

beforeEach(() => {
  h.calls = [];
  h.optIn.mockReset().mockImplementation(async (_t: string, on: boolean) => { h.calls.push(`optIn:${on}`); });
  h.revoke.mockReset().mockImplementation(async () => { h.calls.push('revoke'); });
  useStandingPref.getState().reset();
});

describe('signOut and standing', () => {
  it('clears the choice and queued refs so the next account does not inherit them', async () => {
    useStandingPref.getState().set(true);
    useStandingPref.getState().enqueue(['a']);
    await signOut();
    expect(useStandingPref.getState()).toMatchObject({ optIn: false, queue: [], cohort: undefined, pendingOptOut: false });
  });
  it('flushes an offline opt-out with the old token before the token is revoked', async () => {
    useStandingPref.getState().set(true);
    useStandingPref.getState().set(false); // pendingOptOut, never reached the server
    await signOut();
    expect(h.calls).toEqual(['optIn:false', 'revoke']);
    expect(h.optIn).toHaveBeenCalledWith('tok', false);
  });
  it('a failing flush does not block sign-out', async () => {
    useStandingPref.getState().set(true);
    h.optIn.mockRejectedValue(new Error('offline'));
    await signOut();
    expect(h.revoke).toHaveBeenCalledTimes(1);
    expect(useStandingPref.getState().optIn).toBe(false);
  });
});
