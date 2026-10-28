import { encrypt } from './crypto';
import { BackupError, CURRENT_VERSION, FORMAT, MIN_PASSPHRASE_LENGTH, backupFileName, type BackupPayload, type Envelope, type Snapshot } from './format';

export type PhotoSource = { read: (id: string) => Promise<string> };

/** Gathers the snapshot and the photo files. A photo whose file is missing is left out rather than failing the export. */
export async function buildPayload(snapshot: Snapshot, photos: PhotoSource): Promise<BackupPayload> {
  const photoFiles: Record<string, string> = {};
  for (const p of snapshot.photos) {
    try { photoFiles[p.id] = await photos.read(p.id); } catch { /* file gone: skip it */ }
  }
  return { ...snapshot, rides: snapshot.rides.filter((r) => !r.sample), photos: snapshot.photos.filter((p) => p.id in photoFiles), photoFiles };
}

export async function createBackup(snapshot: Snapshot, photos: PhotoSource, passphrase: string, now = new Date()): Promise<{ fileName: string; text: string }> {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) throw new BackupError('weak-passphrase');
  const payload = await buildPayload(snapshot, photos);
  const createdAt = now.toISOString();
  const ciphertext = await encrypt(new TextEncoder().encode(JSON.stringify(payload)), passphrase, { version: CURRENT_VERSION, createdAt });
  const envelope: Envelope = { format: FORMAT, version: CURRENT_VERSION, createdAt, ciphertext };
  return { fileName: backupFileName(now), text: JSON.stringify(envelope) };
}
