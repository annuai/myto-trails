import { deriveKey, randomBytes, sealRecord } from './crypto';
import { BackupError, CURRENT_VERSION, FORMAT, MIN_PASSPHRASE_LENGTH, backupFileName, type Snapshot } from './format';
import { MAGIC, writeFrame, type ByteWriter } from './stream';

/** Where the backup finds a document photo or a journal file: whether it exists, and its content as base64. */
export type PhotoSource = { has: (id: string) => boolean; read: (id: string) => Promise<string> };
export type JournalSource = { has: (id: string, kind: 'photo' | 'voice') => boolean; read: (id: string, kind: 'photo' | 'voice') => Promise<string> };

const utf8 = (s: string) => new TextEncoder().encode(s);
export const recordAad = (createdAt: string, index: number) => `${FORMAT}|${CURRENT_VERSION}|${createdAt}|${index}`;
const SALT_BYTES = 16;
const toB64 = (b: Uint8Array) => { let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s); };

/**
 * Writes a backup as a stream: a header, one encrypted record with all the data, then one encrypted record per photo
 * or voice file, then an end record. Each file is read, sealed and written before the next is read, so memory stays
 * about one file big however large the journal is. A photo or journal entry whose file is gone is left out.
 */
export async function writeBackup(snapshot: Snapshot, docs: PhotoSource, media: JournalSource, passphrase: string, out: ByteWriter, now = new Date()): Promise<{ fileName: string }> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new BackupError('weak-passphrase');
  const createdAt = now.toISOString();
  const salt = await randomBytes(SALT_BYTES);
  const key = await deriveKey(passphrase, salt);
  let index = 0;
  const seal = async (record: unknown) => writeFrame(out, await sealRecord(key, utf8(JSON.stringify(record)), recordAad(createdAt, index++)));

  const photos = snapshot.photos.filter((p) => docs.has(p.id));
  const journal = snapshot.journal.filter((e) => e.kind === 'note' || media.has(e.id, e.kind));
  await out.write(MAGIC);
  await writeFrame(out, utf8(JSON.stringify({ format: FORMAT, version: CURRENT_VERSION, createdAt, salt: toB64(salt) })));
  await seal({ t: 'meta', data: { ...snapshot, rides: snapshot.rides.filter((r) => !r.sample), photos, journal } });

  let files = 0;
  const file = async (kind: 'doc' | 'photo' | 'voice', id: string, read: () => Promise<string>) => {
    let b64: string;
    try { b64 = await read(); } catch { throw new BackupError('unreadable-file'); }
    await seal({ t: 'file', k: kind, id, b64 });
    files++;
  };
  for (const p of photos) await file('doc', p.id, () => docs.read(p.id));
  for (const e of journal) if (e.kind !== 'note') await file(e.kind, e.id, () => media.read(e.id, e.kind as 'photo' | 'voice'));
  await seal({ t: 'end', n: files });
  return { fileName: backupFileName(now) };
}
