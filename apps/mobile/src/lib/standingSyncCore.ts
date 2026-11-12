import type { RideSummary } from '@/api/standing';
import type { Ride } from '@/store/rides';
import { summaryOf } from './story/standing';
import type { StandingPrefState } from '@/store/standingPrefCore';

const BATCH = 200;
type Pref = Pick<StandingPrefState, 'optIn' | 'queue' | 'dequeue'>;

/**
 * Uploads the queued ride summaries. Nothing is sent without a token or while opted out; opt-out is re-checked before each batch,
 * and a batch is only taken off the queue if the rider is still opted in, so a retry never resurrects an upload after opt-out.
 */
export async function uploadQueued(d: { token: string | null | undefined; pref: () => Pref; rides: () => readonly Ride[]; upload: (token: string, rides: RideSummary[]) => Promise<void> }): Promise<boolean> {
  if (!d.token) return false;
  for (;;) {
    const p = d.pref();
    if (!p.optIn || p.queue.length === 0) return true;
    const refs = p.queue.slice(0, BATCH);
    const all = d.rides();
    const summaries = refs.flatMap((ref) => { const r = all.find((x) => x.id === ref); const s = r && summaryOf(r); return s ? [s] : []; });
    try {
      if (summaries.length > 0) await d.upload(d.token, summaries);
    } catch { return false; } // stays queued for the next try
    if (!d.pref().optIn) return false;
    d.pref().dequeue(refs);
  }
}
