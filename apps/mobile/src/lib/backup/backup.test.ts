import { describe, expect, it } from 'vitest';
import { encrypt } from './crypto';
import { writeBackup, type JournalSource, type PhotoSource } from './export';
import { BackupError, CURRENT_VERSION, FORMAT, fromBase64, toBase64, type BackupPayload, type OpenedBackup, type Snapshot } from './format';
import { applyBackup, fromPayload, mergeSnapshots, openBackup, openBackupFile, summarize, type ByteReader, type ImportMode, type Target } from './import';
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
  journal: [],
  ...over,
});
const files = { p1: toBase64(new Uint8Array([1, 2, 3, 255])) };
const source: PhotoSource = { has: (id) => id in files, read: async (id) => { if (!(id in files)) throw new Error('missing'); return files[id as 'p1']; } };
const noMedia: JournalSource = { has: () => false, read: async () => { throw new Error('none'); } };

/** A backup made in memory, and a reader over its bytes. */
async function build(s: Snapshot, media: JournalSource = noMedia, docs: PhotoSource = source): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  await writeBackup(s, docs, media, PASS, { write: async (b) => { chunks.push(b.slice()); } }, now);
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  return all;
}
const reader = (bytes: Uint8Array): ByteReader => { let at = 0; return { read: async (n) => { const out = bytes.slice(at, at + n); at += out.length; return out; } }; };
const open = (bytes: Uint8Array, pass = PASS): Promise<OpenedBackup> => openBackupFile(reader(bytes), pass);
/** Everything in a backup, files included, in the old single-object shape. */
async function openAll(bytes: Uint8Array, pass = PASS): Promise<BackupPayload> {
  const o = await open(bytes, pass);
  const photoFiles: Record<string, string> = {}, journalFiles: Record<string, string> = {};
  for await (const f of o.files()) (f.kind === 'doc' ? photoFiles : journalFiles)[f.kind === 'doc' ? f.id : `${f.kind}:${f.id}`] = f.b64;
  return { ...o.meta, photoFiles, journalFiles };
}

/** Phone in memory: state plus the photo and journal folders, so an interrupted import can be checked. */
function phone(initial: Snapshot, failOn?: string) {
  const state = { snap: initial, folder: new Map<string, string>(), staged: new Map<string, string>(), discarded: 0, jfolder: new Map<string, string>(), jstaged: new Map<string, string>(), jdiscarded: 0, rolledBack: [] as string[], finalized: [] as string[] };
  const target: Target = {
    get: () => state.snap,
    set: (s) => { state.snap = s; },
    photos: {
      stage: async (id, b64) => { if (id === failOn) throw new Error('disk full'); state.staged.set(id, b64); },
      commit: (mode: ImportMode) => { if (mode === 'replace') state.folder.clear(); for (const [k, v] of state.staged) state.folder.set(k, v); state.staged.clear(); return { finalize: () => { state.finalized.push('photos'); }, rollback: () => { state.rolledBack.push('photos'); } }; },
      discard: () => { state.staged.clear(); state.discarded++; },
    },
    journal: {
      stage: async (kind, id, b64) => { if (id === failOn) throw new Error('disk full'); state.jstaged.set(`${kind}:${id}`, b64); },
      commit: (mode: ImportMode) => { if (mode === 'replace') state.jfolder.clear(); for (const [k, v] of state.jstaged) if (!state.jfolder.has(k)) state.jfolder.set(k, v); state.jstaged.clear(); return { finalize: () => { state.finalized.push('journal'); }, rollback: () => { state.rolledBack.push('journal'); } }; },
      discard: () => { state.jstaged.clear(); state.jdiscarded++; },
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
  it('round trips, leaves out the demo ride, and does not contain the data in the clear', async () => {
    const bytes = await build(snapshot());
    expect(new TextDecoder('latin1').decode(bytes)).not.toContain('MH0120200000001');
    const back = await openAll(bytes);
    expect(back.licence?.number).toBe('MH0120200000001');
    expect(back.rides.map((r) => r.id)).toEqual(['r1']);
    expect(back.photoFiles.p1).toBe(files.p1);
    expect(summarize(back)).toEqual({ rides: 1, todos: 1, contacts: 1, documents: 2, photos: 1, journalEntries: 0 });
  });
  it('skips photos whose file is gone', async () => {
    const s = snapshot({ photos: [...snapshot().photos, { id: 'gone', docKind: 'rc', width: 1, height: 1, addedAt: 1 }] });
    expect((await openAll(await build(s))).photos.map((p) => p.id)).toEqual(['p1']);
  });
  it('a version 2 backup (one JSON text, made before backups were streamed) still opens, files included', async () => {
    const v2 = { ...snapshot(), photoFiles: files, journal: [], journalFiles: {} };
    const createdAt = now.toISOString();
    const ciphertext = await encrypt(new TextEncoder().encode(JSON.stringify(v2)), PASS, { version: 2, createdAt });
    const text = JSON.stringify({ format: FORMAT, version: 2, createdAt, ciphertext });
    const back = await openAll(new TextEncoder().encode(text));
    expect(back.licence?.number).toBe('MH0120200000001');
    expect(back.photoFiles.p1).toBe(files.p1);
    await expect(openAll(new TextEncoder().encode(text), 'another passphrase')).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });
  it('a version 1 backup (made before the journal existed) opens with an empty journal', async () => {
    const v1 = { licence: undefined, vehicle: undefined, contacts: [], medical: {}, photos: [], todos: [], rides: [], photoFiles: {} };
    const createdAt = now.toISOString();
    const ciphertext = await encrypt(new TextEncoder().encode(JSON.stringify(v1)), PASS, { version: 1, createdAt });
    const back = await openAll(new TextEncoder().encode(JSON.stringify({ format: FORMAT, version: 1, createdAt, ciphertext })));
    expect(back.journal).toEqual([]);
    expect(back.journalFiles).toEqual({});
  });
  it('refuses a version 2 text from a newer version, before asking for the passphrase', async () => {
    const err = await openBackup(JSON.stringify({ format: FORMAT, version: CURRENT_VERSION + 1, createdAt: 'x', ciphertext: 'y' }), PASS).catch((e) => e);
    expect(err).toBeInstanceOf(BackupError);
    expect(err.code).toBe('newer-version');
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
  const opened = async (): Promise<OpenedBackup> => open(await build(snapshot({ rides: [ride('r9', 1)] })));
  const local = () => snapshot({ rides: [ride('demo', 0, { sample: true }), ride('mine', 3)], photos: [{ id: 'old', docKind: 'puc', width: 1, height: 1, addedAt: 1 }] });

  it('replace swaps everything but the demo ride, photos included', async () => {
    const p = phone(local()); p.state.folder.set('old', 'x');
    await applyBackup(await opened(), 'replace', p.target);
    expect(p.state.snap.rides.map((r) => r.id)).toEqual(['demo', 'r9']);
    expect([...p.state.folder.keys()]).toEqual(['p1']);
  });
  it('merge keeps phone data and photos', async () => {
    const p = phone(local()); p.state.folder.set('old', 'x');
    await applyBackup(await opened(), 'merge', p.target);
    expect(p.state.snap.rides.map((r) => r.id).sort()).toEqual(['demo', 'mine', 'r9']);
    expect([...p.state.folder.keys()].sort()).toEqual(['old', 'p1']);
  });
  it('an interrupted import leaves the phone untouched', async () => {
    const p = phone(local(), 'p1'); p.state.folder.set('old', 'x');
    const before = p.state.snap;
    await expect(applyBackup(await opened(), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.snap).toBe(before);
    expect([...p.state.folder.keys()]).toEqual(['old']);
    expect(p.state.staged.size).toBe(0);
    expect(p.state.discarded).toBe(1);
  });
  it('a failed swap also leaves the stores alone', async () => {
    const p = phone(local()); const before = p.state.snap;
    p.target.photos.commit = () => { throw new Error('boom'); };
    await expect(applyBackup(await opened(), 'merge', p.target)).rejects.toBeInstanceOf(BackupError);
    expect(p.state.snap).toBe(before);
  });
  it('a damaged record partway through the files fails the import and changes nothing', async () => {
    const s = snapshot({ photos: [] , journal: [{ id: 'a', rideKey: 1, at: 1, kind: 'photo' }, { id: 'b', rideKey: 1, at: 2, kind: 'photo' }] });
    const media: JournalSource = { has: () => true, read: async () => toBase64(new Uint8Array([1, 2, 3])) };
    const bytes = await build(s, media);
    bytes[bytes.length - 50] ^= 1;
    const p = phone(snapshot()); const before = p.state.snap;
    await expect(applyBackup(await open(bytes), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.snap).toBe(before);
    expect(p.state.jstaged.size).toBe(0);
  });
});

describe('journal in the backup', () => {
  const entries = [
    { id: 'n1', rideKey: 100, at: 1, kind: 'note' as const, text: 'Chai stop' },
    { id: 'ph1', rideKey: 100, at: 2, kind: 'photo' as const, text: 'View', width: 4, height: 3 },
    { id: 'v1', rideKey: 100, at: 3, kind: 'voice' as const, durationSec: 12 },
  ];
  const media = { 'photo:ph1': toBase64(new Uint8Array([9, 8, 7])), 'voice:v1': toBase64(new Uint8Array([1, 2, 3, 4, 5])) };
  const mediaSource: JournalSource = { has: (id, kind) => `${kind}:${id}` in media, read: async (id: string, kind: 'photo' | 'voice') => { const f = media[`${kind}:${id}` as keyof typeof media]; if (!f) throw new Error('missing'); return f; } };
  const withJournal = () => snapshot({ rides: [ride('r1', 10, { startedAt: 100 })], journal: entries });
  const file = async (s: Snapshot = withJournal()) => build(s, mediaSource);

  it('round trips the entries and their photo and voice files, and counts them in the summary', async () => {
    const back = await openAll(await file());
    expect(back.journal).toEqual(entries);
    expect(back.journalFiles).toEqual(media);
    expect(summarize(back).journalEntries).toBe(3);
  });
  it('keeps a note but leaves out an entry whose photo or voice file is gone', async () => {
    const s = snapshot({ journal: [...entries, { id: 'lost', rideKey: 100, at: 4, kind: 'photo' as const }] });
    const back = await openAll(await file(s));
    expect(back.journal.map((e) => e.id)).toEqual(['n1', 'ph1', 'v1']);
  });
  it('replace brings back the journal and its files and drops the journal that was on the phone', async () => {
    const p = phone(snapshot({ journal: [{ id: 'old', rideKey: 5, at: 1, kind: 'note', text: 'x' }] }));
    p.state.jfolder.set('photo:oldphoto', 'x');
    await applyBackup(await open(await file()), 'replace', p.target);
    expect(p.state.snap.journal.map((e) => e.id)).toEqual(['n1', 'ph1', 'v1']);
    expect([...p.state.jfolder.keys()].sort()).toEqual(['photo:ph1', 'voice:v1']);
  });
  it('merge keeps the phone\'s journal, adds the file\'s and does not duplicate an entry with the same id', async () => {
    const p = phone(snapshot({ journal: [{ id: 'n1', rideKey: 100, at: 1, kind: 'note', text: 'phone copy' }, { id: 'mine', rideKey: 7, at: 9, kind: 'note', text: 'm' }] }));
    await applyBackup(await open(await file()), 'merge', p.target);
    const ids = p.state.snap.journal.map((e) => e.id).sort();
    expect(ids).toEqual(['mine', 'n1', 'ph1', 'v1']);
    expect(p.state.snap.journal.find((e) => e.id === 'n1')?.text).toBe('phone copy');
  });
  it('an import interrupted while writing journal files leaves the phone untouched and clears both staging folders', async () => {
    const p = phone(snapshot(), 'ph1');
    const before = p.state.snap;
    await expect(applyBackup(await open(await file()), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.snap).toBe(before);
    expect(p.state.jstaged.size).toBe(0);
    expect(p.state.staged.size).toBe(0);
    expect(p.state.jdiscarded + p.state.discarded).toBeGreaterThanOrEqual(2);
  });

  it('if the journal files cannot be swapped in after the document photos were, the photos are rolled back and the stores stay as they were', async () => {
    const p = phone(snapshot()); const before = p.state.snap;
    p.target.journal.commit = () => { throw new Error('boom'); };
    await expect(applyBackup(await open(await file()), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.rolledBack).toEqual(['photos']);
    expect(p.state.finalized).toEqual([]);
    expect(p.state.snap).toBe(before);
  });
  it('the old files are only given up once the stores have been updated', async () => {
    const p = phone(snapshot());
    await applyBackup(await open(await file()), 'replace', p.target);
    expect(p.state.finalized.sort()).toEqual(['journal', 'photos']);
    expect(p.state.rolledBack).toEqual([]);
  });
  it('if updating the stores fails, both swaps are rolled back', async () => {
    const p = phone(snapshot());
    p.target.set = () => { throw new Error('store'); };
    await expect(applyBackup(await open(await file()), 'replace', p.target)).rejects.toMatchObject({ code: 'apply-failed' });
    expect(p.state.rolledBack.sort()).toEqual(['journal', 'photos']);
    expect(p.state.finalized).toEqual([]);
  });
});
