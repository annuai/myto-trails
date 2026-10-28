import { api } from './client';
import type { ConditionKind } from '@/lib/conditions';

// What a rider saw on a trail today. Rider reports are labelled as such and never change a trail's published access (§4.3).
export type ConditionReportBody = { clientId: string; kind: ConditionKind; note?: string; at: string; lat?: number; lng?: number; mediaId?: string };
export type ConditionReportDto = { id: string; kind: ConditionKind; note?: string | null; at: string; confirmations: number; disputes: number; /** Under 14 days old. */ fresh: boolean };

/** Safe to send twice: the server keeps one report per `clientId`. */
export const postConditionReport = (token: string, slug: string, body: ConditionReportBody) => api<{ id: string }>(`/trails/${slug}/condition-reports`, { method: 'POST', token, body });
export const confirmConditionReport = (token: string, id: string, still: boolean) => api<void>(`/condition-reports/${id}/confirm`, { method: 'POST', token, body: { still } });
/** The contract does not fix whether the list is bare or wrapped in `items`; both are read. */
export async function listConditionReports(slug: string): Promise<ConditionReportDto[]> {
  const r = await api<ConditionReportDto[] | { items: ConditionReportDto[] }>(`/trails/${slug}/condition-reports`);
  return Array.isArray(r) ? r : r.items;
}
