import { SYNC_LIMITS, type SyncKind } from '@moto-trails/domain';

/**
 * The phone's side of sync (docs/sync-design.md). The stores stay the source of truth and know nothing about sync: this finds what
 * changed by comparing each item with what the server last had (a hash), so no screen needs to say "mark this as changed".
 * Everything here is pure; `runSync.ts` does the network and the stores.
 */
export type Key = string;
export const keyOf = (kind: SyncKind, id: string): Key => `${kind}:${id}`;
export const splitKey = (k: Key): { kind: SyncKind; id: string } => { const i = k.indexOf(':'); return { kind: k.slice(0, i) as SyncKind, id: k.slice(i + 1) }; };

/** An item as it travels: only the fields that sync (a ride's points travel as a track, its review state stays on the phone). */
export type Item = { id: string; /** The rider's last edit, when the store records it. */ updatedAt?: number; data: Record<string, unknown> };

export type Adapter = {
  kind: SyncKind;
  list(): Item[];
  get(id: string): Item | undefined;
  /** Create or replace the local copy with what another phone sent. A ride also gets its points once they are downloaded. */
  put(id: string, data: Record<string, unknown>, updatedAt: number, extra?: { points?: unknown; breaks?: number[] }): void;
  remove(id: string): void;
  /** A ride only: the local copy becomes `toId` with a new name, because another phone edited the same ride. */
  rekey?(fromId: string, toId: string, nameSuffix: string): void;
  /** A ride only: its points, compressed for upload. */
  track?(id: string): Uint8Array | null;
};

export type Baseline = { hash: string; serverUpdatedAt: number; /** This phone has the ride's points. */ track?: true };
export type Dirty = { updatedAt: number; deleted: boolean };
export type SyncState = {
  enabled: boolean;
  deviceId: string;
  cursor: string | null;
  baseline: Record<Key, Baseline>;
  dirty: Record<Key, Dirty>;
  tracksPending: string[];
  /** Pull everything again next time (after a stale or conflicting push). */
  fullPull: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
  /** Why some changes are not going up: `quota` (100 rides), `scope` (sign in again), or null. */
  blocked: 'quota' | 'scope' | null;
  /** Items too large to sync (a record is at most 16 KB). */
  skipped: number;
};

export const initialState = (deviceId: string): SyncState => ({ enabled: false, deviceId, cursor: null, baseline: {}, dirty: {}, tracksPending: [], fullPull: false, lastSyncedAt: null, lastError: null, blocked: null, skipped: 0 });

/** Same value in, same text out, whatever the order of keys. `undefined` is dropped like JSON does. */
export function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
}
/** cyrb53: a 53-bit hash; two different edits of one item colliding is vanishingly unlikely. */
export function hashOf(v: unknown): string {
  const s = stable(v);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const tooBig = (data: Record<string, unknown>) => stable(data).length > SYNC_LIMITS.maxRecordBytes - 512;

/** Finds new, edited and deleted items by comparing the stores with the baseline. Returns a new state. */
export function scan(state: SyncState, adapters: Adapter[], now: number): SyncState {
  const dirty: Record<Key, Dirty> = { ...state.dirty };
  let skipped = 0;
  const seen = new Set<Key>();
  for (const a of adapters) {
    for (const item of a.list()) {
      const key = keyOf(a.kind, item.id);
      seen.add(key);
      if (tooBig(item.data)) { skipped += 1; delete dirty[key]; continue; }
      const base = state.baseline[key];
      if (!base || base.hash !== hashOf(item.data)) {
        const earlier = dirty[key]?.updatedAt ?? 0;
        dirty[key] = { updatedAt: Math.max(item.updatedAt ?? now, earlier), deleted: false };
      } else if (dirty[key] && !dirty[key]!.deleted) delete dirty[key]; // edited and put back: nothing to send
    }
  }
  const kinds = new Set(adapters.map((a) => a.kind));
  for (const key of Object.keys(state.baseline)) {
    if (seen.has(key) || !kinds.has(splitKey(key).kind)) continue;
    dirty[key] = { updatedAt: dirty[key]?.updatedAt ?? now, deleted: true };
  }
  // Created and deleted before it ever reached the server: nothing to tell it.
  for (const key of Object.keys(dirty)) if (!seen.has(key) && !state.baseline[key]) delete dirty[key];
  return { ...state, dirty, skipped };
}

export type OutChange = { kind: SyncKind; id: string; data?: Record<string, unknown>; updatedAt: string; baseUpdatedAt: string | null; deleted?: true };
export type Batch = { changes: OutChange[]; sent: Record<Key, { hash: string; updatedAt: number; deleted: boolean }> };
/** The API accepts 64 KB a request; stay well under it. */
export const MAX_BATCH_CHARS = 48_000;

export function buildBatches(state: SyncState, adapters: Adapter[]): Batch[] {
  const batches: Batch[] = [];
  let cur: Batch = { changes: [], sent: {} };
  let size = 0;
  const flush = () => { if (cur.changes.length) batches.push(cur); cur = { changes: [], sent: {} }; size = 0; };
  for (const [key, d] of Object.entries(state.dirty)) {
    const { kind, id } = splitKey(key);
    const item = d.deleted ? undefined : adapters.find((a) => a.kind === kind)?.get(id);
    if (!d.deleted && !item) continue;
    const base = state.baseline[key];
    const change: OutChange = { kind, id, updatedAt: new Date(d.updatedAt).toISOString(), baseUpdatedAt: base && base.serverUpdatedAt > 0 ? new Date(base.serverUpdatedAt).toISOString() : null, ...(d.deleted ? { deleted: true as const } : { data: item!.data }) };
    const len = JSON.stringify(change).length;
    if (cur.changes.length >= SYNC_LIMITS.maxChanges || (cur.changes.length > 0 && size + len > MAX_BATCH_CHARS)) flush();
    cur.changes.push(change); size += len;
    cur.sent[key] = { hash: d.deleted ? '' : hashOf(item!.data), updatedAt: d.updatedAt, deleted: d.deleted };
  }
  flush();
  return batches;
}

export type PushResult = {
  accepted: { kind: SyncKind; id: string }[];
  conflicts: { kind: SyncKind; id: string; copyId: string }[];
  stale: { kind: SyncKind; id: string }[];
  overQuota: { kind: SyncKind; id: string }[];
};

/** Updates the state with the server's answer, and renames the local copy of a ride that was edited on two phones. */
export function afterPush(state: SyncState, batch: Batch, result: PushResult, adapters: Adapter[]): SyncState {
  const baseline = { ...state.baseline };
  const dirty = { ...state.dirty };
  const tracks = new Set(state.tracksPending);
  let fullPull = state.fullPull;
  let blocked = state.blocked;
  const rides = adapters.find((a) => a.kind === 'ride');

  for (const r of result.accepted) {
    const key = keyOf(r.kind, r.id); const s = batch.sent[key]; if (!s) continue;
    delete dirty[key];
    if (s.deleted) { delete baseline[key]; tracks.delete(r.id); continue; }
    baseline[key] = { hash: s.hash, serverUpdatedAt: s.updatedAt, ...(r.kind === 'ride' ? { track: true as const } : {}) };
    if (r.kind === 'ride') tracks.add(r.id);
  }
  for (const r of result.stale) {
    const key = keyOf(r.kind, r.id); const item = adapters.find((a) => a.kind === r.kind)?.get(r.id);
    delete dirty[key];
    // Treat the local copy as clean at "version 0": the full pull below replaces it with the server's newer one.
    if (item) baseline[key] = { hash: hashOf(item.data), serverUpdatedAt: 0, ...(baseline[key]?.track ? { track: true as const } : {}) };
    fullPull = true;
  }
  for (const r of result.conflicts) {
    const key = keyOf(r.kind, r.id); const s = batch.sent[key];
    delete dirty[key]; delete baseline[key];
    if (r.kind !== 'ride' || !rides?.rekey || !s) continue;
    rides.rekey(r.id, r.copyId, ' (other phone)');
    const copy = rides.get(r.copyId);
    if (copy) { baseline[keyOf('ride', r.copyId)] = { hash: hashOf(copy.data), serverUpdatedAt: s.updatedAt, track: true }; tracks.add(r.copyId); }
    fullPull = true; // the other phone's version of this ride comes back under its own id
  }
  if (result.overQuota.length) blocked = 'quota';
  else if (blocked === 'quota' && result.accepted.length) blocked = null;
  return { ...state, baseline, dirty, tracksPending: [...tracks], fullPull, blocked };
}

export type Pulled = { kind: SyncKind; id: string; data: Record<string, unknown>; updatedAt: string; deleted: boolean; hasTrack: boolean };

/** What to do with one pulled change, given this phone's state. */
export function planPulled(state: SyncState, c: Pulled): 'skip' | 'delete' | 'apply' | 'apply-with-track' | 'track-only' {
  const key = keyOf(c.kind, c.id);
  if (state.dirty[key]) return 'skip'; // a local edit is waiting; the next push settles who wins
  const base = state.baseline[key];
  if (c.deleted) return 'delete';
  const have = base !== undefined && base.serverUpdatedAt === Date.parse(c.updatedAt);
  if (c.kind === 'ride' && c.hasTrack && !(base?.track)) return have ? 'track-only' : 'apply-with-track';
  return have ? 'skip' : 'apply';
}

/** After a pulled item has been stored, record what the store now holds so the next scan sees no difference. */
export function recordApplied(state: SyncState, adapter: Adapter, c: Pulled, track: boolean): SyncState {
  const key = keyOf(c.kind, c.id);
  const item = adapter.get(c.id);
  const baseline = { ...state.baseline };
  if (item) baseline[key] = { hash: hashOf(item.data), serverUpdatedAt: Date.parse(c.updatedAt), ...(track || baseline[key]?.track ? { track: true as const } : {}) };
  const dirty = { ...state.dirty }; delete dirty[key];
  return { ...state, baseline, dirty };
}
export function recordDeleted(state: SyncState, c: Pulled): SyncState {
  const key = keyOf(c.kind, c.id);
  const baseline = { ...state.baseline }; const dirty = { ...state.dirty };
  delete baseline[key]; delete dirty[key];
  return { ...state, baseline, dirty };
}
