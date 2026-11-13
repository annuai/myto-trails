import { afterPush, buildBatches, planPulled, recordApplied, recordDeleted, scan, type Adapter, type Pulled, type PushResult, type SyncState } from './syncCore';
import { decodeTrack } from './trackCodec';

/** What the network side must offer. `api.ts` implements it over /api/v1; tests implement it with a fake server. */
export type SyncApi = {
  push(deviceId: string, changes: unknown[]): Promise<PushResult>;
  pull(q: { deviceId: string; since: string | null; limit: number }): Promise<{ changes: Pulled[]; cursor: string; more: boolean }>;
  putTrack(rideId: string, bytes: Uint8Array): Promise<'ok' | 'no_such_ride' | 'over_quota' | 'too_large'>;
  getTrack(rideId: string): Promise<Uint8Array | null>;
};
export type SyncDeps = { api: SyncApi; adapters: Adapter[]; get: () => SyncState; set: (s: SyncState) => void; now: () => number };

/** A failure the rider can act on, with the state it leaves behind. */
export class SyncFailure extends Error { constructor(readonly kind: 'scope' | 'other', message: string) { super(message); } }

const MAX_PAGES = 50;

/**
 * One round: find changes, send them (and the ride tracks), then fetch other phones' changes. Safe to call at any time and to
 * repeat: every step is idempotent, and a failure part-way leaves the work for the next round.
 */
export async function runSync(d: SyncDeps): Promise<void> {
  if (!d.get().enabled) return;
  const rides = d.adapters.find((a) => a.kind === 'ride');
  d.set(scan(d.get(), d.adapters, d.now()));

  // 1. Send.
  for (const batch of buildBatches(d.get(), d.adapters)) {
    const result = await d.api.push(d.get().deviceId, batch.changes);
    d.set(afterPush(d.get(), batch, result, d.adapters));
  }

  // 2. Tracks of rides that were just sent. A failed upload stays pending; a ride that has gone, or is too big, is dropped.
  for (const id of d.get().tracksPending) {
    const bytes = rides?.track?.(id) ?? null;
    const outcome = bytes ? await d.api.putTrack(id, bytes) : 'no_such_ride';
    if (outcome === 'ok' || outcome === 'no_such_ride' || outcome === 'too_large') d.set({ ...d.get(), tracksPending: d.get().tracksPending.filter((x) => x !== id) });
    else d.set({ ...d.get(), blocked: 'quota' });
  }

  // 3. Fetch.
  let since = d.get().fullPull ? null : d.get().cursor;
  let finished = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await d.api.pull({ deviceId: d.get().deviceId, since, limit: 100 });
    for (const c of res.changes) await applyOne(d, c);
    since = res.cursor;
    d.set({ ...d.get(), cursor: res.cursor });
    if (!res.more) { finished = true; break; }
  }
  d.set({ ...d.get(), ...(finished ? { fullPull: false } : {}), lastSyncedAt: d.now(), lastError: null });
}

async function applyOne(d: SyncDeps, c: Pulled): Promise<void> {
  const adapter = d.adapters.find((a) => a.kind === c.kind);
  if (!adapter) return; // a kind this version of the app does not have yet
  const plan = planPulled(d.get(), c);
  if (plan === 'skip') return;
  if (plan === 'delete') { adapter.remove(c.id); d.set(recordDeleted(d.get(), c)); return; }
  let extra: { points?: unknown; breaks?: number[] } | undefined;
  if (plan === 'apply-with-track' || plan === 'track-only') {
    const bytes = await d.api.getTrack(c.id);
    // The track is not there yet (the other phone is still uploading it): leave this ride for the next round.
    if (!bytes) return;
    extra = decodeTrack(bytes);
  }
  if (plan === 'track-only') {
    const have = adapter.get(c.id);
    if (!have) return;
    adapter.put(c.id, have.data, Date.parse(c.updatedAt), extra);
  } else adapter.put(c.id, c.data, Date.parse(c.updatedAt), extra);
  d.set(recordApplied(d.get(), adapter, c, plan !== 'apply'));
}
