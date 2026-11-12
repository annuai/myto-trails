import { describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';

vi.hoisted(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = false; });
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-crypto', () => ({}));
vi.mock('expo-linking', () => ({}));
vi.mock('expo-secure-store', () => ({}));
vi.mock('@/api/client', () => ({ api: vi.fn(async () => undefined) }));
vi.mock('@/api/useApi', () => ({ forgetProfile: vi.fn() }));
vi.mock('@/lib/imageCache', () => ({ wipeImageCache: vi.fn(async () => undefined) }));
vi.mock('@/store/submissionQueue', () => ({ useSubmissionQueue: { getState: () => ({ setItems: vi.fn() }) } }));
vi.mock('@/store/auth', () => ({ useAuth: { getState: () => ({ token: 'tok', clear: vi.fn() }) } }));
vi.mock('@/store/standingPref', async () => {
  const { standingPrefSlice } = await import('@/store/standingPrefCore');
  return { useStandingPref: create(standingPrefSlice({ now: Date.now, current: () => undefined, fetchCohort: vi.fn() })) };
});

import { useStandingPref } from '@/store/standingPref';
import { signOut } from './signIn';

describe('signOut', () => {
  it('clears the standing choice and queued refs so the next account does not inherit them', async () => {
    useStandingPref.getState().set(true);
    useStandingPref.getState().enqueue(['a']);
    await signOut();
    expect(useStandingPref.getState()).toMatchObject({ optIn: false, queue: [], cohort: undefined, pendingOptOut: false });
  });
});
