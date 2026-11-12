import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import type { CohortRow } from '@moto-trails/domain';

// The API client reads React Native's __DEV__ flag when it loads.
vi.hoisted(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = false; });
vi.mock('@/store/persist', () => ({ storage: undefined }));
vi.mock('@/store/standingPref', async () => {
  const { standingPrefSlice } = await import('@/store/standingPrefCore');
  return { useStandingPref: create(standingPrefSlice({ now: Date.now, current: () => undefined, fetchCohort: vi.fn() })) };
});

import { useStandingPref } from '@/store/standingPref';
import { nextGapKm, standingFor } from './nudgeWorld';

const NOW = new Date(2026, 10, 13, 10).getTime();
const row = (n = 40): CohortRow => ({ n, deciles: [10, 20, 30, 40, 50, 60, 70, 80, 90] });
const cohort = (over: { value?: number; period?: string; n?: number } = {}) =>
  ({ region: 'your area', period: over.period ?? '2026-11', metric: 'distance_km' as const, value: over.value ?? 65, row: row(over.n), fetchedAt: NOW });

beforeEach(() => useStandingPref.getState().reset());

describe('standingFor', () => {
  it('is none for a rider who opted out, even with a cohort kept', () => {
    useStandingPref.setState({ optIn: false, cohort: cohort() });
    expect(standingFor(NOW)).toBeUndefined();
  });
  it('is none for a cohort from another month', () => {
    useStandingPref.setState({ optIn: true, cohort: cohort({ period: '2026-10' }) });
    expect(standingFor(NOW)).toBeUndefined();
  });
  it('is none for a cohort under 20 riders', () => {
    useStandingPref.setState({ optIn: true, cohort: cohort({ n: 19 }) });
    expect(standingFor(NOW)).toBeUndefined();
  });
  it('gives the percentile and the gap to the next cut point', () => {
    useStandingPref.setState({ optIn: true, cohort: cohort({ value: 65 }) });
    expect(standingFor(NOW)).toEqual({ aheadOf: 65, region: 'your area', nextGap: 5 });
  });
});

describe('nextGapKm', () => {
  it('on a cut point, is the gap to the next one', () => {
    expect(nextGapKm(40, row())).toBe(10);
  });
  it('above the last cut point, is none', () => {
    expect(nextGapKm(95, row())).toBeUndefined();
    expect(nextGapKm(90, row())).toBeUndefined();
  });
});
