import { decrypt, deriveKey, openRecord } from './crypto';
import { recordAad } from './export';
import { BackupError, CURRENT_VERSION, FORMAT, fromBase64, parseEnvelope, type BackupFile, type BackupPayload, type OpenedBackup, type Snapshot } from './format';
import { assertPayload, migrate } from './migrate';
import { MAGIC, readExact, readFrame, type ByteReader } from './stream';

export type { ByteReader } from './stream';

export type ImportMode = 'replace' | 'merge';
/** A swap of files that is made but not final: `finalize` gives up the old files, `rollback` puts everything back. */
export type Swap = { finalize: () => void; rollback: () => void };
export type PhotoSink = {
  stage: (id: string, base64: string) => Promise<void>;
  commit: (mode: ImportMode) => Swap;
  discard: () => void;
};
export type JournalSink = {
  stage: (kind: 'photo' | 'voice', id: string, base64: string) => Promise<void>;
  commit: (mode: ImportMode) => Swap;
  discard: () => void;
};
/** The phone side of an import: read and write the stores, and the photo and journal folders. */
export type Target = { get: () => Snapshot; set: (next: Snapshot) => void; photos: PhotoSink; journal: JournalSink };

const utf8 = (b: Uint8Array) => new TextDecoder().decode(b);
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

/** A version 1 or 2 backup: one JSON text with every file inside it. */
export async function openBackup(text: string, passphrase: string): Promise<BackupPayload> {
  const env = parseEnvelope(text);
  const plain = await decrypt(env.ciphertext, passphrase, env);
  let data: unknown;
  try { data = JSON.parse(utf8(plain)); } catch { throw new BackupError('corrupt'); }
  const payload = migrate(data, env.version);
  assertPayload(payload);
  return payload;
}

/** Presents an old-format payload the same way as a streamed backup. */
export function fromPayload(p: BackupPayload): OpenedBackup {
  const { photoFiles, journalFiles, ...meta } = p;
  return {
    meta,
    files: async function* () {
      for (const [id, b64] of Object.entries(photoFiles)) yield { kind: 'doc', id, b64 };
      for (const [key, b64] of Object.entries(journalFiles)) { const [kind, ...rest] = key.split(':'); yield { kind: kind as 'photo' | 'voice', id: rest.join(':'), b64 }; }
    },
  };
}

function assertMeta(m: unknown): asserts m is Snapshot {
  const x = m as Partial<Snapshot> | null;
  const ok = !!x && Array.isArray(x.contacts) && Array.isArray(x.todos) && Array.isArray(x.rides) && Array.isArray(x.photos) && Array.isArray(x.journal) && typeof x.medical === 'object' && x.medical !== null;
  if (!ok) throw new BackupError('corrupt');
}

/**
 * Opens a backup file of any version. A streamed backup is checked and its data read straight away; its files are
 * decrypted one at a time as `files()` is iterated, and a damaged, reordered or cut-short file fails there.
 */
export async function openBackupFile(reader: ByteReader, passphrase: string): Promise<OpenedBackup> {
  const first = new Uint8Array(MAGIC.length);
  let got = 0;
  while (got < first.length) {
    const c = await reader.read(first.length - got);
    if (!c.length) break;
    first.set(c, got); got += c.length;
  }
  if (got === 0) throw new BackupError('not-a-backup');
  if (first[0] === 0x7b) {
    // `{`: a version 1 or 2 backup, which is small JSON text.
    const parts: Uint8Array[] = [first.slice(0, got)];
    for (;;) { const c = await reader.read(1 << 20); if (!c.length) break; parts.push(c.slice()); }
    const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    return fromPayload(await openBackup(utf8(all), passphrase));
  }
  if (got < first.length || first.some((b, i) => b !== MAGIC[i])) throw new BackupError('not-a-backup');

  const headBytes = await readFrame(reader);
  if (!headBytes) throw new BackupError('corrupt');
  let header: { format?: string; version?: number; createdAt?: string; salt?: string };
  try { header = JSON.parse(utf8(headBytes)); } catch { throw new BackupError('not-a-backup'); }
  if (header.format !== FORMAT || typeof header.version !== 'number' || typeof header.createdAt !== 'string' || typeof header.salt !== 'string') throw new BackupError('not-a-backup');
  if (header.version > CURRENT_VERSION) throw new BackupError('newer-version');
  if (header.version !== CURRENT_VERSION) throw new BackupError('not-a-backup');
  const createdAt = header.createdAt;
  const key = await deriveKey(passphrase, fromBase64(header.salt));

  let index = 0;
  const next = async () => {
    const frame = await readFrame(reader);
    if (!frame) throw new BackupError('corrupt');
    let rec: { t?: string; [k: string]: unknown };
    const plain = openRecord(key, frame, recordAad(createdAt, index++));
    try { rec = JSON.parse(utf8(plain)); } catch { throw new BackupError('corrupt'); }
    return rec;
  };
  const metaRec = await next();
  if (metaRec.t !== 'meta') throw new BackupError('corrupt');
  assertMeta(metaRec.data);
  return {
    meta: metaRec.data,
    files: async function* () {
      let n = 0;
      for (;;) {
        const rec = await next();
        if (rec.t === 'end') {
          if (rec.n !== n || (await readFrame(reader)) !== null) throw new BackupError('corrupt');
          return;
        }
        if (rec.t !== 'file' || !['doc', 'photo', 'voice'].includes(rec.k as string)) throw new BackupError('corrupt');
        const kind = rec.k as BackupFile['kind'];
        if (typeof rec.id !== 'string' || !SAFE_ID.test(rec.id) || typeof rec.b64 !== 'string') throw new BackupError('corrupt');
        n++;
        yield { kind, id: rec.id, b64: rec.b64 };
      }
    },
  };
}

export type Summary = { rides: number; todos: number; contacts: number; documents: number; photos: number; journalEntries: number };
export const summarize = (p: Snapshot): Summary => ({
  rides: p.rides.length, todos: p.todos.length, contacts: p.contacts.length,
  documents: (p.licence ? 1 : 0) + (p.vehicle ? 1 : 0), photos: p.photos.length, journalEntries: p.journal.length,
});

type Stamped = { updatedAt?: number };
/** Newer `updatedAt` wins; on a tie, or when neither has one, the copy on the phone stays. */
const newer = <T extends Stamped>(local: T | undefined, incoming: T | undefined): T | undefined =>
  !incoming ? local : !local ? incoming : (incoming.updatedAt ?? 0) > (local.updatedAt ?? 0) ? incoming : local;

function mergeById<T extends { id: string } & Stamped>(local: T[], incoming: T[]): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const x of incoming) byId.set(x.id, newer(byId.get(x.id), x) as T);
  return [...byId.values()];
}

/** Copy of `incoming` as a Snapshot, without the photo files. */
const plain = (p: Snapshot): Snapshot => ({ licence: p.licence, vehicle: p.vehicle, contacts: p.contacts, medical: p.medical, photos: p.photos, todos: p.todos, rides: p.rides, journal: p.journal, bike: p.bike });

export function mergeSnapshots(local: Snapshot, incoming: Snapshot): Snapshot {
  const contacts = mergeById(local.contacts, incoming.contacts);
  // the primary contact is one of the contacts: keep exactly one
  const primary = contacts.filter((c) => c.primary);
  const fixed = contacts.map((c, i) => ({ ...c, primary: primary.length ? c === primary[0] : i === 0 }));
  return {
    licence: newer(local.licence, incoming.licence), vehicle: newer(local.vehicle, incoming.vehicle),
    medical: newer(local.medical, incoming.medical) ?? local.medical,
    contacts: fixed,
    photos: [...new Map([...local.photos, ...incoming.photos].map((p) => [p.id, p])).values()],
    todos: mergeById(local.todos, incoming.todos), rides: mergeById(local.rides, incoming.rides),
    // an entry with the same id is the same entry: the phone's copy stays
    journal: [...new Map([...incoming.journal, ...local.journal].map((e) => [e.id, e])).values()],
    bike: incoming.bike !== undefined && local.bike === undefined ? incoming.bike : local.bike,
  };
}

/** Replace keeps the demo ride, which is not the rider's data. */
export const replaceSnapshot = (local: Snapshot, incoming: Snapshot): Snapshot => ({
  ...plain(incoming), rides: [...local.rides.filter((r) => r.sample), ...incoming.rides],
});

/**
 * Works out the result first, stages the photos and journal files one at a time as they are decrypted, swaps them in, and only
 * then changes the stores and gives up the old files. Any failure before that leaves the phone as it was.
 */
export async function applyBackup(opened: OpenedBackup, mode: ImportMode, target: Target): Promise<void> {
  const next = mode === 'replace' ? replaceSnapshot(target.get(), opened.meta) : mergeSnapshots(target.get(), opened.meta);
  let photos: Swap | undefined;
  let journal: Swap | undefined;
  const undo = () => { photos?.rollback(); journal?.rollback(); target.photos.discard(); target.journal.discard(); };
  try {
    for await (const f of opened.files()) {
      if (f.kind === 'doc') await target.photos.stage(f.id, f.b64);
      else await target.journal.stage(f.kind, f.id, f.b64);
    }
    photos = target.photos.commit(mode);
    journal = target.journal.commit(mode);
    target.set(next);
  } catch {
    undo();
    throw new BackupError('apply-failed');
  }
  // Only now are the old files given up.
  photos?.finalize();
  journal?.finalize();
}
