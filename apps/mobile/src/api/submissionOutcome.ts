import { api } from './client';
import { outcomeFor, type ServerSubmission } from '@/lib/submissionOutcome';

/** What the moderators have done with a ride that was sent for review, found by the trail slug it was sent under. Nothing when it cannot be found. */
export async function fetchOutcome(token: string, slug: string): Promise<{ status: string; feedback?: string } | undefined> {
  const { items } = await api<{ items: ServerSubmission[] }>('/me/submissions', { token });
  const o = outcomeFor(items, slug);
  if (!o) return undefined;
  if (o.status !== 'changes_requested' && o.status !== 'rejected') return { status: o.status };
  const d = await api<{ moderatorFeedback?: string | null }>(`/submissions/${o.id}`, { token });
  return { status: o.status, ...(d.moderatorFeedback ? { feedback: d.moderatorFeedback } : {}) };
}
