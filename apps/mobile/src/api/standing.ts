import type { CohortRow, StandingMetric } from '@moto-trails/domain';
import { api } from './client';

/** The only fields a ride summary may carry. No route, no coordinates, no time of day: the server refuses anything else. */
export type RideSummary = { ref: string; day: string; distanceKm: number; durationSec: number; cell: string };

/** Chooses whether the rider's coarse ride summaries count towards area cohorts. */
export const setStandingOptIn = (token: string, optIn: boolean) => api<void>('/me/standing-opt-in', { method: 'PUT', token, body: { optIn } });
/** Sends the coarse ride summaries. */
export const uploadSummaries = (token: string, rides: RideSummary[]) => api<void>('/me/ride-summaries', { method: 'PUT', token, body: { rides } });
/** Reads an area's cohort figures for a period and metric. */
export const getCohort = (token: string | undefined, cell: string, period: string, metric: StandingMetric) =>
  api<CohortRow>(`/cohort?cell=${encodeURIComponent(cell)}&period=${encodeURIComponent(period)}&metric=${metric}`, { token });
