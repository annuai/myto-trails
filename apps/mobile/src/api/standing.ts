import type { CohortRow, StandingMetric } from '@moto-trails/domain';
import { api } from './client';

/** The only fields a ride summary may carry. No route, no coordinates, no time of day: the server refuses anything else. */
export type RideSummary = { ref: string; day: string; distanceKm: number; durationSec: number; cell: string };

export const setStandingOptIn = (token: string, optIn: boolean) => api<void>('/me/standing-opt-in', { method: 'PUT', token, body: { optIn } });
export const uploadSummaries = (token: string, rides: RideSummary[]) => api<void>('/me/ride-summaries', { method: 'PUT', token, body: { rides } });
export const getCohort = (token: string | undefined, cell: string, period: string, metric: StandingMetric) =>
  api<CohortRow>(`/cohort?cell=${encodeURIComponent(cell)}&period=${encodeURIComponent(period)}&metric=${metric}`, { token });
