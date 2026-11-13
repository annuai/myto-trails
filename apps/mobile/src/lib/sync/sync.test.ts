import { describe, expect, it } from 'vitest';
import { SYNC_LIMITS, decideSync, forkId } from '@moto-trails/domain';
import { initialState, scan, hashOf, stable, type Adapter, type Item, type Pulled, type SyncState } from './syncCore';
import { runSync, type SyncApi } from './runSync';
import { decodeTrack, encodeTrack } from './trackCodec';
import type { LatLng } from '@/lib/geo';

// ---- A fake phone: one in-memory store per kind, with the same adapter surface as the real ones.
type Row = { id: string; updatedAt?: number; data: Record<string, unknown>; points?: LatLng[] };
function phone(deviceId: string, now: { t: number }) {
  const rides = new Map<string, Row>(); const todos = new Map<string, Row>();
  const mk = (kind: 'ride' | 'todo', m: Map<string, Row>): Adapter => ({
    kind,
    list: () => [...m.values()].map((r): Item => ({ id: r.id, updatedAt: r.updatedAt, data: r.data })),
    get: (id) => { const r = m.get(id); return r ? { id, updatedAt: r.updatedAt, data: r.data } : undefined; },
    put: (id, data, updatedAt, extra) => { m.set(id, { id, updatedAt, data, points: (extra?.points as LatLng[] | undefined) ?? m.get(id)?.points }); },
    remove: (id) => { m.delete(id); },
    ...(kind === 'ride' ? {
      rekey: (from: string, to: string, suffix: string) => { const r = m.get(from)!; m.delete(from); m.set(to, { ...r, id: to, data: { ...r.data, name: `${String(r.data.name)}${suffix}` } }); },
      track: (id: string) => { const r = m.get(id); return r?.points ? encodeTrack(r.points) : null; },
    } : {}),
  });
  let state: SyncState = { ...initialState(deviceId), enabled: true };
  return {
    rides, todos, deviceId, adapters: [mk('ride', rides), mk('todo', todos)],
    get state() { return state; }, set state(s: SyncState) { state = s; },
    editRide(id: string, data: Record<string, unknown>, points?: LatLng[]) { now.t += 1000; rides.set(id, { id, updatedAt: now.t, data, points: points ?? rides.get(id)?.points }); },
    editTodo(id: string, data: Record<string, unknown>) { now.t += 1000; todos.set(id, { id, updatedAt: now.t, data }); },
  };
}

// ---- A fake server that applies the real conflict rules (decideSync) and the same pull/overlap semantics.
function server(now: { t: number }) {
  type Rec = { kind: 'ride' | 'todo'; id: string; data: Record<string, unknown>; updatedAt: number; origin: string; deleted: boolean; track?: Uint8Array; seq: number };
  const recs = new Map<string, Rec>(); let seq = 0;
  const api = (deviceId: string): SyncApi => ({
    async push(_d, changes) {
      const out = { accepted: [] as { kind: 'ride' | 'todo'; id: string }[], conflicts: [] as { kind: 'ride' | 'todo'; id: string; copyId: string }[], stale: [] as { kind: 'ride' | 'todo'; id: string }[], overQuota: [] as { kind: 'ride' | 'todo'; id: string }[] };
      for (const c of changes as { kind: 'ride' | 'todo'; id: string; data?: Record<string, unknown>; updatedAt: string; baseUpdatedAt: string | null; deleted?: boolean }[]) {
        const k = `${c.kind}:${c.id}`; const row = recs.get(k);
        const dec = decideSync(c.kind, row ? { updatedAt: row.updatedAt, originDevice: row.origin, deleted: row.deleted } : null, { updatedAt: Date.parse(c.updatedAt), deviceId, baseUpdatedAt: c.baseUpdatedAt ? Date.parse(c.baseUpdatedAt) : null, deleted: c.deleted === true });
        if (dec === 'stale') { out.stale.push({ kind: c.kind, id: c.id }); continue; }
        if (dec === 'fork') {
          const copyId = forkId(c.id, deviceId);
          recs.set(`ride:${copyId}`, { kind: 'ride', id: copyId, data: { ...c.data, name: `${String(c.data!.name)} (other phone)` }, updatedAt: Date.parse(c.updatedAt), origin: deviceId, deleted: false, seq: ++seq });
          out.conflicts.push({ kind: c.kind, id: c.id, copyId }); continue;
        }
        recs.set(k, { kind: c.kind, id: c.id, data: c.data ?? {}, updatedAt: Date.parse(c.updatedAt), origin: deviceId, deleted: c.deleted === true, track: c.deleted ? undefined : row?.track, seq: ++seq });
        out.accepted.push({ kind: c.kind, id: c.id });
      }
      return out;
    },
    async pull({ since }) {
      const from = since === null ? 0 : Number(since);
      const rows = [...recs.values()].filter((r) => r.seq > from && r.origin !== deviceId).sort((a, b) => a.seq - b.seq);
      return { changes: rows.map((r): Pulled => ({ kind: r.kind, id: r.id, data: r.data, updatedAt: new Date(r.updatedAt).toISOString(), deleted: r.deleted, hasTrack: r.track !== undefined })), cursor: String(rows.at(-1)?.seq ?? from), more: false };
    },
    async putTrack(id, bytes) { const r = recs.get(`ride:${id}`); if (!r || r.deleted) return 'no_such_ride'; r.track = bytes; r.seq = ++seq; return 'ok'; },
    async getTrack(id) { return recs.get(`ride:${id}`)?.track ?? null; },
  });
  return { recs, api, now };
}

const sync = (p: ReturnType<typeof phone>, s: ReturnType<typeof server>, now: { t: number }) => runSync({ api: s.api(p.deviceId), adapters: p.adapters, get: () => p.state, set: (st) => { p.state = st; }, now: () => now.t });
const pts = (n: number): LatLng[] => Array.from({ length: n }, (_, i) => ({ lat: 12.9 + i * 1e-4, lng: 77.5 + i * 1e-4, t: 1_700_000_000_000 + i * 1000 }));

describe('scan', () => {
  it('hashes the same whatever the key order', () => {
    expect(stable({ b: 1, a: [2, { d: 1, c: undefined }] })).toBe('{"a":[2,{"d":1}],"b":1}');
    expect(hashOf({ a: 1, b: 2 })).toBe(hashOf({ b: 2, a: 1 }));
    expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
  });
  it('marks new, edited and removed items, and forgets one created and deleted before it was sent', () => {
    const now = { t: 5000 }; const p = phone('dev-aaaa-0001', now);
    p.editRide('r1', { name: 'A' }); p.editTodo('t1', { title: 'x' });
    let st = scan(p.state, p.adapters, now.t);
    expect(Object.keys(st.dirty).sort()).toEqual(['ride:r1', 'todo:t1']);
    p.todos.delete('t1');
    st = scan(st, p.adapters, now.t);
    expect(Object.keys(st.dirty)).toEqual(['ride:r1']);
    st = { ...st, baseline: { 'ride:r1': { hash: hashOf({ name: 'A' }), serverUpdatedAt: 1 } }, dirty: {} };
    expect(scan(st, p.adapters, now.t).dirty).toEqual({});
    p.rides.delete('r1');
    expect(scan(st, p.adapters, now.t).dirty['ride:r1']).toEqual({ updatedAt: now.t, deleted: true });
  });
  it('leaves out an item too large to sync, and says how many', () => {
    const now = { t: 1 }; const p = phone('dev-aaaa-0001', now);
    p.editRide('big', { name: 'x'.repeat(SYNC_LIMITS.maxRecordBytes) });
    const st = scan(p.state, p.adapters, now.t);
    expect(st.dirty).toEqual({}); expect(st.skipped).toBe(1);
  });
});

describe('two phones', () => {
  it('a ride, with its points, reaches the second phone, and a rename comes back', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editRide('r1', { name: 'Ghat run', distanceKm: 42 }, pts(50));
    await sync(a, s, now); await sync(b, s, now);
    expect(b.rides.get('r1')!.data).toEqual({ name: 'Ghat run', distanceKm: 42 });
    expect(b.rides.get('r1')!.points).toHaveLength(50);
    b.editRide('r1', { name: 'Ghat run (best)', distanceKm: 42 });
    await sync(b, s, now); await sync(a, s, now);
    expect(a.rides.get('r1')!.data.name).toBe('Ghat run (best)');
    expect(a.rides.get('r1')!.points).toHaveLength(50); // the points are kept when only the name changed
  });

  it('syncing twice changes nothing, and nothing is pushed when nothing changed', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editRide('r1', { name: 'One' }, pts(5)); a.editTodo('t1', { title: 'Chain lube', done: false });
    await sync(a, s, now); await sync(b, s, now);
    const before = JSON.stringify([...s.recs.values()].map((r) => [r.id, r.seq]));
    await sync(a, s, now); await sync(b, s, now); await sync(a, s, now);
    expect(JSON.stringify([...s.recs.values()].map((r) => [r.id, r.seq]))).toBe(before);
    expect(b.todos.get('t1')!.data).toEqual({ title: 'Chain lube', done: false });
  });

  it('a delete on one phone removes the ride on the other', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editRide('r1', { name: 'One' }, pts(5));
    await sync(a, s, now); await sync(b, s, now);
    a.rides.delete('r1');
    await sync(a, s, now); await sync(b, s, now);
    expect(b.rides.has('r1')).toBe(false);
    await sync(a, s, now); await sync(b, s, now);
    expect(a.rides.size + b.rides.size).toBe(0);
  });

  it('a ride edited on both phones is kept twice on both, and neither phone loses its edit', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editRide('r1', { name: 'Ride' }, pts(10));
    await sync(a, s, now); await sync(b, s, now);
    a.editRide('r1', { name: 'Ride (A)' }); b.editRide('r1', { name: 'Ride (B)' });
    await sync(a, s, now); await sync(b, s, now); // b loses the race, so b's version is forked
    await sync(a, s, now); await sync(b, s, now);
    const names = (p: ReturnType<typeof phone>) => [...p.rides.values()].map((r) => String(r.data.name)).sort();
    expect(names(a)).toEqual(['Ride (A)', 'Ride (B) (other phone)']);
    expect(names(b)).toEqual(['Ride (A)', 'Ride (B) (other phone)']);
    for (const p of [a, b]) for (const r of p.rides.values()) expect(r.points).toHaveLength(10);
    // And it stays that way.
    await sync(a, s, now); await sync(b, s, now);
    expect(names(a)).toEqual(names(b)); expect(a.rides.size).toBe(2);
  });

  it('a stale to-do edit loses to the newer one and the phone ends up with the newer text', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editTodo('t1', { title: 'one' });
    await sync(a, s, now); await sync(b, s, now);
    a.editTodo('t1', { title: 'older edit' });
    now.t += 5000; b.editTodo('t1', { title: 'newer edit' });
    await sync(b, s, now); await sync(a, s, now); await sync(a, s, now);
    expect(a.todos.get('t1')!.data.title).toBe('newer edit');
    expect(b.todos.get('t1')!.data.title).toBe('newer edit');
  });

  it('a ride whose points are not up yet appears first, and gets its points on a later round', async () => {
    const now = { t: 1_000_000 }; const s = server(now); const a = phone('dev-aaaa-0001', now); const b = phone('dev-bbbb-0002', now);
    a.editRide('r1', { name: 'One' }, pts(8));
    // The record gets there but the upload of the points fails once.
    const real = s.api(a.deviceId); let failed = false;
    await runSync({ api: { ...real, putTrack: async (id, bytes) => { if (!failed) { failed = true; throw new Error('no signal'); } return real.putTrack(id, bytes); } }, adapters: a.adapters, get: () => a.state, set: (st) => { a.state = st; }, now: () => now.t }).catch(() => undefined);
    expect(a.state.tracksPending).toEqual(['r1']);
    await sync(b, s, now);
    expect(b.rides.get('r1')!.points).toBeUndefined(); // the ride shows with its stats; the points follow
    await sync(a, s, now); await sync(b, s, now);
    expect(b.rides.get('r1')!.points).toHaveLength(8);
    expect(decodeTrack(s.recs.get('ride:r1')!.track!).points).toHaveLength(8);
  });
});
