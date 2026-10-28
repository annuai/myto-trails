import { describe, expect, it } from 'vitest';
import { writeBackup, type JournalSource, type PhotoSource } from './export';
import { BackupError, CURRENT_VERSION, toBase64, type Snapshot } from './format';
import { openBackupFile, type ByteReader } from './import';
import type { ByteWriter } from './stream';

const PASS = 'correct horse battery';
const now = new Date('2026-10-28T10:00:00Z');
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  contacts: [], medical: {}, todos: [], rides: [],
  photos: [{ id: 'd1', docKind: 'licence', width: 1, height: 1, addedAt: 1 }],
  journal: [{ id: 'n1', rideKey: 1, at: 1, kind: 'note', text: 'hi' }, { id: 'ph1', rideKey: 1, at: 2, kind: 'photo' }, { id: 'v1', rideKey: 1, at: 3, kind: 'voice', durationSec: 5 }],
  ...over,
});
const data = { d1: [1, 2, 3], ph1: [4, 5, 6, 7], v1: [8, 9] };
const docs = (log: string[] = []): PhotoSource => ({ has: (id) => id in data, read: async (id) => { log.push(`read:${id}`); return toBase64(Uint8Array.from(data[id as 'd1'])); } });
const media = (log: string[] = []): JournalSource => ({ has: (id) => id in data, read: async (id) => { log.push(`read:${id}`); return toBase64(Uint8Array.from(data[id as 'ph1'])); } });

const memoryWriter = (log: string[] = []) => { const chunks: Uint8Array[] = []; const w: ByteWriter = { write: async (b) => { log.push('write'); chunks.push(b.slice()); } }; return { w, bytes: () => { const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; } return all; } }; };
const memoryReader = (bytes: Uint8Array): ByteReader => { let at = 0; return { read: async (n) => { const out = bytes.slice(at, at + n); at += out.length; return out; } }; };
async function make(s = snap(), log: string[] = [], wlog?: string[]) { const m = memoryWriter(wlog); await writeBackup(s, docs(log), media(log), PASS, m.w, now); return m.bytes(); }
async function drain(bytes: Uint8Array, pass = PASS) {
  const opened = await openBackupFile(memoryReader(bytes), pass);
  const files: Record<string, string> = {};
  for await (const f of opened.files()) files[`${f.kind}:${f.id}`] = f.b64;
  return { meta: opened.meta, files };
}

describe('streamed backup file', () => {
  it('round trips the data and every file, and does not contain the data in the clear', async () => {
    const bytes = await make();
    expect(new TextDecoder('latin1').decode(bytes)).not.toContain('hi');
    const { meta, files } = await drain(bytes);
    expect(meta.journal.map((e) => e.id)).toEqual(['n1', 'ph1', 'v1']);
    expect(Object.keys(files).sort()).toEqual(['doc:d1', 'photo:ph1', 'voice:v1']);
    expect(files['voice:v1']).toBe(toBase64(Uint8Array.from([8, 9])));
  });
  it('reads one file at a time and writes it out before reading the next, so memory stays small', async () => {
    const events: string[] = [];
    const m = memoryWriter(events);
    await writeBackup(snap(), docs(events), media(events), PASS, m.w, now);
    const reads = events.filter((e) => e !== 'write');
    expect(reads).toEqual(['read:d1', 'read:ph1', 'read:v1']);
    const firstRead = events.indexOf('read:ph1');
    expect(events.slice(0, firstRead).filter((e) => e === 'write').length).toBeGreaterThanOrEqual(4); // magic, header, data, and the first file
  });
  it('leaves out an entry or photo whose file is gone, but keeps notes', async () => {
    const s = snap({ journal: [...snap().journal, { id: 'gone', rideKey: 1, at: 9, kind: 'voice', durationSec: 1 }], photos: [...snap().photos, { id: 'dgone', docKind: 'rc', width: 1, height: 1, addedAt: 1 }] });
    const { meta } = await drain(await make(s));
    expect(meta.journal.map((e) => e.id)).toEqual(['n1', 'ph1', 'v1']);
    expect(meta.photos.map((p) => p.id)).toEqual(['d1']);
  });
  it('refuses a short passphrase', async () => {
    await expect(writeBackup(snap(), docs(), media(), 'short', memoryWriter().w, now)).rejects.toMatchObject({ code: 'weak-passphrase' });
  });
  it('a wrong passphrase fails at once', async () => {
    await expect(drain(await make(), 'another passphrase')).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });
  it('a changed byte in a file fails authentication when that file is read', async () => {
    const bytes = await make();
    bytes[bytes.length - 40] ^= 1;
    await expect(drain(bytes)).rejects.toBeInstanceOf(BackupError);
  });
  it('a file cut short is refused as damaged, not opened with files missing', async () => {
    const bytes = await make();
    const err = await drain(bytes.slice(0, bytes.length - 60)).catch((e) => e);
    expect(err).toBeInstanceOf(BackupError);
    expect(['corrupt', 'wrong-passphrase']).toContain(err.code);
  });
  it('a file with its last record removed (a clean cut at a record boundary) is refused', async () => {
    const bytes = await make();
    // walk the frames and drop the final one (the end marker)
    let at = 6; const starts: number[] = [];
    while (at < bytes.length) { starts.push(at); const len = new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0); at += 4 + len; }
    const cut = bytes.slice(0, starts[starts.length - 1]);
    await expect(drain(cut)).rejects.toMatchObject({ code: 'corrupt' });
  });
  it('records swapped around are refused', async () => {
    const bytes = await make();
    let at = 6; const frames: Uint8Array[] = [];
    while (at < bytes.length) { const len = new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0); frames.push(bytes.slice(at, at + 4 + len)); at += 4 + len; }
    const [magic, header, meta, f1, f2, ...rest] = [bytes.slice(0, 6), ...frames];
    const swapped = new Uint8Array(bytes.length);
    let o = 0; for (const f of [magic, header, meta, f2, f1, ...rest]) { swapped.set(f, o); o += f.length; }
    await expect(drain(swapped)).rejects.toBeInstanceOf(BackupError);
  });
  it('a date edited in the clear header fails authentication', async () => {
    const bytes = await make();
    const text = new TextDecoder('latin1').decode(bytes);
    const i = text.indexOf('2026-10-28');
    const edited = bytes.slice(); edited[i + 2] = '3'.charCodeAt(0);
    await expect(drain(edited)).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });
  it('refuses files from a newer version and files that are not backups', async () => {
    const bytes = await make();
    const text = new TextDecoder('latin1').decode(bytes);
    const i = text.indexOf(`"version":${CURRENT_VERSION}`);
    const newer = bytes.slice(); newer[i + '"version":'.length] = '9'.charCodeAt(0);
    await expect(drain(newer)).rejects.toMatchObject({ code: 'newer-version' });
    await expect(drain(new TextEncoder().encode('hello this is not a backup'))).rejects.toMatchObject({ code: 'not-a-backup' });
    await expect(drain(new Uint8Array(0))).rejects.toMatchObject({ code: 'not-a-backup' });
  });
  it('refuses a file record with an unsafe id', async () => {
    const s = snap({ photos: [], journal: [{ id: '../evil', rideKey: 1, at: 1, kind: 'photo' }] });
    const m = memoryWriter();
    const bad: PhotoSource & JournalSource = { has: () => true, read: async () => toBase64(Uint8Array.from([1])) };
    await writeBackup(s, bad, bad, PASS, m.w, now);
    await expect(drain(m.bytes())).rejects.toMatchObject({ code: 'corrupt' });
  });
});
