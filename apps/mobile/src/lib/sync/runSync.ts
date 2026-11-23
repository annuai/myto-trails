import { afterPush, buildBatches, keyOf, planPulled, recordApplied, recordDeleted, scan, type Adapter, type ApplyOp, type Pulled, type PushResult, type SyncState } from './syncCore';
import { whileApplying } from './applying';
import { decodeTrack } from './trackCodec';

/** What the network side must offer. `api.ts` implements it over /api/v1; tests implement it with a fake server. */
export type SyncApi = {
  push(deviceId: string, changes: unknown[]): Promise<PushResult>;
  pull(q: { deviceId: string; since: string | null; limit: number }): Promise<{ changes: Pulled[]; cursor: string; more: boolean }>;
  putTrack(rideId: string, bytes: Uint8Array): Promise<'ok' | 'no_such_ride' | 'over_quota' | 'too_large'>;
  getTrack(rideId: string): Promise<Uint8Array | null>;
};
/** What one sync run needs: the API, the adapters, the sync state and the clock. */
export type SyncDeps = { api: SyncApi; adapters: Adapter[]; get: () => SyncState; set: (s: SyncState) => void; now: () => number };

/** A failure the rider can act on, with the state it leaves behind. */
export class SyncFailure extends Error { constructor(readonly kind: 'scope' | 'other', message: string) { super(message); } }

const MAX_PAGES = 50;
/** A pulled page is applied this many changes at a time: one store write each, and the progress is saved after each, so an interrupted pull resumes instead of starting again. */
export const APPLY_CHUNK = 25;
/** Ride tracks downloaded at once. */
const TRACK_PARALLEL = 4;

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
  let trackMissing = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await d.api.pull({ deviceId: d.get().deviceId, since, limit: 100 });
    if (await applyPage(d, res.changes)) trackMissing = true;
    since = res.cursor;
    d.set({ ...d.get(), cursor: res.cursor });
    if (!res.more) { finished = true; break; }
  }
  // A ride whose route was not on the server yet (the other phone is still uploading it) was left out of this round. Pull everything
  // again next time: what this phone already has is skipped, so that costs one request, and the ride comes in once its route is there.
  d.set({ ...d.get(), ...(finished ? { fullPull: trackMissing } : {}), lastSyncedAt: d.now(), lastError: null });
}

type Planned = { c: Pulled; adapter: Adapter; plan: 'delete' | 'apply' | 'apply-with-track' | 'track-only' };

/** Applies one pulled page a chunk at a time. Returns true when a ride was left out because its route is not on the server yet. */
async function applyPage(d: SyncDeps, changes: Pulled[]): Promise<boolean> {
  let missing = false;
  for (let i = 0; i < changes.length; i += APPLY_CHUNK) {
    if (await applyChunk(d, changes.slice(i, i + APPLY_CHUNK))) missing = true;
  }
  return missing;
}

async function applyChunk(d: SyncDeps, chunk: Pulled[]): Promise<boolean> {
  const before = d.get();
  const planned: Planned[] = [];
  for (const c of chunk) {
    const adapter = d.adapters.find((a) => a.kind === c.kind);
    if (!adapter) continue; // a kind this version of the app does not have yet
    const plan = planPulled(before, c);
    if (plan === 'skip') continue;
    // A delete for something this phone never had (most of a long-lived account's history) needs no work at all.
    if (plan === 'delete' && !before.baseline[keyOf(c.kind, c.id)] && !adapter.get(c.id)) continue;
    planned.push({ c, adapter, plan });
  }

  // Routes first (network, a few at a time), so the stores are then updated in one go.
  const tracks = new Map<string, { points?: unknown; breaks?: number[] }>();
  const needTrack = planned.filter((p) => p.plan === 'apply-with-track' || p.plan === 'track-only');
  await inParallel(needTrack, TRACK_PARALLEL, async (p) => {
    const bytes = await d.api.getTrack(p.c.id);
    if (!bytes) return;
    try { tracks.set(p.c.id, decodeTrack(bytes)); } catch { /* an unreadable route is treated like a missing one */ }
  });

  const ready = planned.filter((p) => (p.plan !== 'apply-with-track' && p.plan !== 'track-only') || tracks.has(p.c.id));
  const missing = ready.length < planned.length;

  const ops = new Map<Adapter, ApplyOp[]>();
  const add = (a: Adapter, op: ApplyOp) => { const l = ops.get(a); if (l) l.push(op); else ops.set(a, [op]); };
  const applied: Planned[] = [];
  for (const p of ready) {
    const { c, adapter, plan } = p;
    if (plan === 'delete') add(adapter, { type: 'remove', id: c.id });
    else if (plan === 'track-only') {
      const have = adapter.get(c.id);
      if (!have) continue;
      add(adapter, { type: 'put', id: c.id, data: have.data, updatedAt: Date.parse(c.updatedAt), extra: tracks.get(c.id) });
    } else add(adapter, { type: 'put', id: c.id, data: c.data, updatedAt: Date.parse(c.updatedAt), extra: tracks.get(c.id) });
    applied.push(p);
  }

  // Synchronous from here: nothing else can touch the stores in between, and the edit watcher is told these are not the rider's edits.
  let state = d.get();
  whileApplying(() => {
    for (const [adapter, list] of ops) applyOps(adapter, list);
    for (const { c, adapter, plan } of applied) state = plan === 'delete' ? recordDeleted(state, c) : recordApplied(state, adapter, c, plan !== 'apply');
  });
  d.set(state);
  return missing;
}

function applyOps(adapter: Adapter, list: ApplyOp[]): void {
  if (adapter.applyMany) { adapter.applyMany(list); return; }
  for (const op of list) {
    if (op.type === 'remove') adapter.remove(op.id);
    else adapter.put(op.id, op.data, op.updatedAt, op.extra);
  }
}

/** Runs `f` over `items`, at most `limit` at a time. The first failure stops the rest and is thrown. */
async function inParallel<T>(items: T[], limit: number, f: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => { while (next < items.length) await f(items[next++]!); };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
