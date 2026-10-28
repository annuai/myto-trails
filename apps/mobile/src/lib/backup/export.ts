import { encrypt } from './crypto';
import { BackupError, CURRENT_VERSION, FORMAT, MIN_PASSPHRASE_LENGTH, backupFileName, type BackupPayload, type Envelope, type Snapshot } from './format';

export type PhotoSource = { read: (id: string) => Promise<string> };
export type JournalSource = { read: (id: string, kind: 'photo' | 'voice') => Promise<string> };
/** The most photo and voice data (as base64 text) one backup file may hold. The file is built in memory, and a phone runs out well before this times a few copies. */
export const MAX_MEDIA_CHARS = 150 * 1024 * 1024;
const noJournalFiles: JournalSource = { read: async () => { throw new Error('no journal files'); } };

/** Gathers the snapshot and the photo files. A photo whose file is missing is left out rather than failing the export. */
export async function buildPayload(snapshot: Snapshot, photos: PhotoSource, media: JournalSource = noJournalFiles, limit = MAX_MEDIA_CHARS): Promise<BackupPayload> {
  let size = 0;
  const count = (b64: string) => { size += b64.length; if (size > limit) throw new BackupError('too-large'); return b64; };
  const photoFiles: Record<string, string> = {};
  for (const p of snapshot.photos) {
    let b64: string | undefined;
    try { b64 = await photos.read(p.id); } catch { /* file gone: skip it */ }
    if (b64 !== undefined) photoFiles[p.id] = count(b64);
  }
  // A voice or photo entry whose file is gone is left out; a note never has a file.
  const journalFiles: Record<string, string> = {};
  const journal = [];
  for (const e of snapshot.journal) {
    if (e.kind === 'note') { journal.push(e); continue; }
    let b64: string | undefined;
    try { b64 = await media.read(e.id, e.kind); } catch { /* file gone: skip the entry */ }
    if (b64 !== undefined) { journalFiles[`${e.kind}:${e.id}`] = count(b64); journal.push(e); }
  }
  return { ...snapshot, rides: snapshot.rides.filter((r) => !r.sample), photos: snapshot.photos.filter((p) => p.id in photoFiles), photoFiles, journal, journalFiles };
}

export async function createBackup(snapshot: Snapshot, photos: PhotoSource, passphrase: string, now = new Date(), media?: JournalSource): Promise<{ fileName: string; text: string }> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new BackupError('weak-passphrase');
  const payload = await buildPayload(snapshot, photos, media);
  const createdAt = now.toISOString();
  const ciphertext = await encrypt(new TextEncoder().encode(JSON.stringify(payload)), passphrase, { version: CURRENT_VERSION, createdAt });
  const envelope: Envelope = { format: FORMAT, version: CURRENT_VERSION, createdAt, ciphertext };
  return { fileName: backupFileName(now), text: JSON.stringify(envelope) };
}
