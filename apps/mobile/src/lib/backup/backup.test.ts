import { describe, expect, it } from 'vitest';
import { createBackup } from './export';
import { BackupError, CURRENT_VERSION, FORMAT, fromBase64, toBase64, type BackupPayload, type Snapshot } from './format';
import { applyBackup, mergeSnapshots, openBackup, summarize, type ImportMode, type Target } from './import';
import { migrate } from './migrate';

const PASS = 'correct horse battery';
const now = new Date('2026-10-28T10:00:00Z');

const ride = (id: string, updatedAt?: number, extra = {}) => ({ id, name: id, startedAt: 1, durationSec: 1, distanceKm: 1, maxKmh: 1, points: [], waypoints: [], updatedAt, ...extra });
const snapshot = (over: Partial<Snapshot> = {}): Snapshot => ({
  licence: { holder: 'A Rider', number: 'MH0120200000001', classes: ['MCWG'], updatedAt: 10 },
  vehicle: { regNo: 'MH01AB1234', model: 'Himalayan', ownerName: 'A Rider', updatedAt: 10 },
  contacts: [{ id: 'c1', name: 'Mum', phone: '1', relation: 'Mother', primary: true, updatedAt: 10 }],
  medical: { bloodGroup: 'O+', updatedAt: 10 },
  photos: [{ id: 'p1', docKind: 'licence', side: 'front', width: 10, height: 10, addedAt: 1 }],
  todos: [{ id: 't1', title: 'PUC', category: 'document', kind: 'date', done: false, updatedAt: 10 }],
  rides: [ride('r1', 10), ride('demo', 0, { sample: true })],
  ...over,
});
const files = { p1: toBase64(new Uint8Array([1, 2, 3, 255])) };
const source = { read: async (id: string) => { if (!(id in files)) throw new Error('missing'); return files[id as 'p1']; } };

/** Phone in memory: state plus a photo folder, so an interrupted import can be checked. */
function phone(initial: Snapshot, failOn?: string) {
  const state = { snap: initial, folder: new Map<string, string>(), staged: new Map<string, string>(), discarded: 0 };
  const target: Target = {
    get: () => state.snap,
    set: (s) => { state.snap = s; },
    photos: {
      stage: async (id, b64) => { if (id === failOn) throw new Error('disk full'); state.staged.set(id, b64); },
      commit: (mode: ImportMode) => { if (mode === 'replace') state.folder.clear(); for (const [k, v] of state.staged) state.folder.set(k, v); state.staged.clear(); },
      discard: () => { state.staged.clear(); state.discarded++; },
    },
  };
  return { state, target };
}

describe('base64', () => {
  it('round trips every length', () => {
    for (let n = 0; n < 12; n++) { const b = Uint8Array.from({ length: n }, (_, i) => i * 37 + 200); expect([...fromBase64(toBase64(b))]).toEqual([...b]); }
  });
});

describe('backup file', () => {
  it('round trips, names the file by date and leaves out the demo ride', async () => {
    const { fileName, text } = await createBackup(snapshot(), source, PASS, now);
    expect(fileName).toBe('myto-backup-2026-10-28.myto');
    const env = JSON.parse(text);
    expect(Object.keys(env).sort()).toEqual(['ciphertext', 'createdAt', 'format', 'version']);
    expect(text).not.toContain('MH0120200000001');
    const back = await openBackup(text, PASS);
    expect(back.licence?.number).toBe('MH0120200000001');
    expect(back.rides.map((r) => r.id)).toEqual(['r1']);
    expect(back.photoFiles.p1).toBe(files.p1);
    expect(summarize(back)).toEqual({ rides: 1, todos: 1, contacts: 1, documents: 2, photos: 1 });
  });

  it('refuses a short passphrase', async () => {
    await expect(createBackup(snapshot(), source, 'short', now)).rejects.toMatchObject({ code: 'weak-passphrase' });
  });

  it('skips photos whose file is gone', async () => {
    const s = snapshot({ photos: [...snapshot().photos, { id: 'gone', docKind: 'rc', width: 1, height: 1, addedAt: 1 }] });
    const back = await openBackup((await createBackup(s, source, PASS, now)).text, PASS);
    expect(back.photos.map((p) => p.id)).toEqual(['p1']);
  });

  it('rejects a wrong passphrase', async () => {
    const { text } = await createBackup(snapshot(), source, PASS, now);
    await expect(openBackup(text, 'another passphrase')).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });

  it('fails authentication when one byte of the ciphertext changes', async () => {
    const { text } = await createBackup(snapshot(), source, PASS, now);
    const env = JSON.parse(text);
    const bytes = fromBase64(env.ciphertext);
    bytes[bytes.length - 20] ^= 1;
    await expect(openBackup(JSON.stringify({ ...env, ciphertext: toBase64(bytes) }), PASS)).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });

  it('fails when the date in the clear is edited', async () => {
    const { text } = await createBackup(snapshot(), source, PASS, now);
    await expect(openBackup(JSON.stringify({ ...JSON.parse(text), createdAt: '2020-01-01T00:00:00.000Z' }), PASS)).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });

  it('refuses a file from a newer version, before asking for the passphrase', async () => {
    const { text } = await createBackup(snapshot(), source, PASS, now);
    const err = await openBackup(JSON.stringify({ ...JSON.parse(text), version: CURRENT_VERSION + 1 }), PASS).catch((e) => e);
    expect(err).toBeInstanceOf(BackupError);
    expect(err.code).toBe('newer-version');
    expect(err.message).toMatch(/newer version/);
  });

  it('refuses files that are not backups', async () => {
    for (const t of ['not json', '{}', JSON.stringify({ format: 'other', version: 1, createdAt: 'x', ciphertext: 'y' })]) await expect(openBackup(t, PASS)).rejects.toMatchObject({ code: 'not-a-backup' });
    expect(FORMAT).toBe('myto-backup');
  });
});

describe('migrate', () => {
  it('runs one step per version, in order', () => {
    const steps = { 1: (p: any) => ({ ...p, trail: [...(p.trail ?? []), '1to2'] }), 2: (p: any) => ({ ...p, trail: [...p.trail, '2to3'] }) };
    expect((migrate({}, 1, 3, steps) as any).trail).toEqual(['1to2', '2to3']);
  });
  it('refuses a payload that needs a missing step or comes from the future', () => {
    expect(() => migrate({}, 1, 2, {})).toThrow(BackupError);
    expect(() => migrate({}, 3, 2, {})).toThrow(/newer version/);
  });
});

describe('merge', () => {
  const incoming = (over: Partial<Snapshot>) => snapshot({ rides: [], photos: [], todos: [], contacts: [], licence: undefined, vehicle: undefined, medical: {}, ...over });

  it('adds what is new and keeps what is only on the phone', () => {
    const m = mergeSnapshots(snapshot(), incoming({ rides: [ride('r2', 5)], todos: [{ id: 't2', title: 'x', category: 'other', kind: 'date', done: false }] }));
    expect(m.rides.map((r) => r.id).sort()).toEqual(['demo', 'r1', 'r2']);
    expect(m.todos.map((t) => t.id)).toEqual(['t1', 't2']);
  });
  it('the newer updatedAt wins on a clash, and the phone wins a tie', () => {
    const local = snapshot({ rides: [ride('r1', 10, { name: 'phone' })] });
    expect(mergeSnapshots(local, incoming({ rides: [ride('r1', 11, { name: 'file' })] })).rides[0].name).toBe('file');
    expect(mergeSnapshots(local, incoming({ rides: [ride('r1', 9, { name: 'file' })] })).rides[0].name).toBe('phone');
    expect(mergeSnapshots(local, incoming({ rides: [ride('r1', 10, { name: 'file' })] })).rides[0].name).toBe('phone');
  });
  it('applies the same rule to licence, vehicle and medical', () => {
    const m = mergeSnapshots(snapshot(), incoming({ licence: { holder: 'New', number: 'N', classes: [], updatedAt: 99 }, vehicle: { regNo: 'OLD', model: 'm', ownerName: '', updatedAt: 1 }, medical: { bloodGroup: 'A+', updatedAt: 5 } }));
    expect(m.licence?.holder).toBe('New');
    expect(m.vehicle?.regNo).toBe('MH01AB1234');
    expect(m.medical.bloodGroup).toBe('O+');
  });
  it('keeps exactly one primary contact', () => {
    const m = mergeSnapshots(snapshot(), incoming({ contacts: [{ id: 'c2', name: 'Dad', phone: '2', relation: 'Father', primary: true }] }));
    expect(m.contacts.filter((c) => c.primary)).toHaveLength(1);
  });
  it('does not duplicate photos', () => {
    expect(mergeSnapshots(snapshot(), incoming({ photos: snapshot().photos })).photos).toHaveLength(1);
  });
});

describe('applying an import', () => {
  const payload = async (): Promise<BackupPayload> => openBackup((await createBackup(snapshot({ rides: [ride('r9', 1)] }), source, PASS, now)).text, PASS);
  const local = () => snapshot({ rides: [ride('demo', 0, { sample: true }), ride('mine', 3)], photos: [{ id: 'old', docKind: 'puc', width: 1, height: 1, addedAt: 1 }] });

  it('replace swaps everything but the demo ride, photos included', async () => {
    const p = phone(local()); p.state.folder.set('old', 'x');
    await applyBackup(await payload(), 'replace', p.target);
    expect(p.state.snap.rides.map((r) => r.id)).toEqual(['demo', 'r9']);
    expect([...p.state.folder.keys()]).toEqual(['p1']);
  });
  it('merge keeps phone data and photos', async () => {
    const p = phone(local()); p.state.folder.set('old', 'x');
    await applyBackup(await payload(), 'merge', p.target);
    expect(p.state.snap.rides.map((r) => r.id).sort()).toEqual(['demo', 'mine', 'r9']);
    expect([...p.state.folder.keys()].sort()).toEqual(['old', 'p1']);
  });
  it('an interrupted import leaves the phone untouched', async () => {
    const p = phone(local(), 'p1'); p.state.folder.set('old', 'x');
    const before = p.state.snap;
    await expect(applyBackup(await payload(), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.snap).toBe(before);
    expect([...p.state.folder.keys()]).toEqual(['old']);
    expect(p.state.staged.size).toBe(0);
    expect(p.state.discarded).toBe(1);
  });
  it('a failed swap also leaves the stores alone', async () => {
    const p = phone(local()); const before = p.state.snap;
    p.target.photos.commit = () => { throw new Error('boom'); };
    await expect(applyBackup(await payload(), 'merge', p.target)).rejects.toBeInstanceOf(BackupError);
    expect(p.state.snap).toBe(before);
  });
});
