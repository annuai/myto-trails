export type ServerSubmission = { id: string; status: string; title: string | null; trailSlug: string | null; updatedAt: string };
export type OutcomeTone = 'good' | 'caution' | 'stop' | 'unknown';

const SHOWN = new Set(['submitted', 'changes_requested', 'approved', 'rejected']);

/** The server's submission for a ride sent under `slug`, unless it is a draft or was withdrawn (nothing for the rider to read there). */
export function outcomeFor(items: ServerSubmission[], slug: string): { id: string; status: string } | undefined {
  const s = items.find((i) => i.trailSlug === slug);
  return s && SHOWN.has(s.status) ? { id: s.id, status: s.status } : undefined;
}

/** What a status means for the rider. Approval is a review result, not a promise about the trail's access or condition. */
export function outcomeText(status: string, feedback?: string | null): { label: string; tone: OutcomeTone; note?: string } {
  const note = feedback?.trim() || undefined;
  switch (status) {
    case 'approved': return { label: 'Approved', tone: 'good' };
    case 'changes_requested': return { label: 'Changes requested', tone: 'caution', ...(note ? { note } : {}) };
    case 'rejected': return { label: 'Not accepted', tone: 'stop', ...(note ? { note } : {}) };
    default: return { label: 'In review', tone: 'unknown' };
  }
}
