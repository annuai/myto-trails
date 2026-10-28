import type { Todo } from '../todos';
import type { DocPhoto } from '../localMedia/types';
import type { JournalEntry } from '../journalEntries';
import type { Ride } from '@/store/rides';
import type { Contact, Licence, Medical, Vehicle } from '@/store/profile';

export const FORMAT = 'myto-backup';
/** Bump with every change to `BackupPayload` and add a `migrate` step from the old number. */
export const CURRENT_VERSION = 2;
export const MIN_PASSPHRASE_LENGTH = 10;
export const FILE_EXTENSION = 'myto';

/** What the file says about itself in the clear. Everything else is inside `ciphertext`. */
export type Envelope = { format: typeof FORMAT; version: number; createdAt: string; ciphertext: string };

/** Everything a backup restores. Never holds the sign-in token, offline trail packs or the quote queue. */
export type Snapshot = {
  licence?: Licence; vehicle?: Vehicle; contacts: Contact[]; medical: Medical;
  photos: DocPhoto[]; todos: Todo[]; rides: Ride[];
  /** Ride journal entries (notes, voice, photos). Their files are in `journalFiles`. */
  journal: JournalEntry[];
  /** Chosen bike, when the app stores one on the phone. */
  bike?: unknown;
};
/** Plaintext inside the ciphertext. `photoFiles` maps a photo id to its JPEG as base64; `journalFiles` maps `photo:<id>` or `voice:<id>` to the file as base64. */
export type BackupPayload = Snapshot & { photoFiles: Record<string, string>; journalFiles: Record<string, string> };

export type BackupErrorCode = 'not-a-backup' | 'newer-version' | 'wrong-passphrase' | 'corrupt' | 'apply-failed' | 'weak-passphrase';

const messages: Record<BackupErrorCode, string> = {
  'not-a-backup': 'This is not a Myto backup file.',
  'newer-version': 'This backup was made by a newer version of Myto. Update the app and try again.',
  'wrong-passphrase': 'Wrong passphrase, or the file is damaged.',
  corrupt: 'The backup file is damaged and cannot be read.',
  'apply-failed': 'Nothing was changed on this phone: the backup could not be applied.',
  'weak-passphrase': `Use a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`,
};

export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) { super(messages[code]); this.name = 'BackupError'; }
}

export function backupFileName(now: Date) {
  return `myto-backup-${now.toISOString().slice(0, 10)}.${FILE_EXTENSION}`;
}

export function parseEnvelope(text: string): Envelope {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new BackupError('not-a-backup'); }
  const e = raw as Partial<Envelope> | null;
  if (!e || e.format !== FORMAT || typeof e.version !== 'number' || typeof e.createdAt !== 'string' || typeof e.ciphertext !== 'string') throw new BackupError('not-a-backup');
  if (!Number.isInteger(e.version) || e.version < 1) throw new BackupError('not-a-backup');
  if (e.version > CURRENT_VERSION) throw new BackupError('newer-version');
  return e as Envelope;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_BITS = 6;
const BYTE_BITS = 8;

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * B64_BITS) / BYTE_BITS));
  let acc = 0, bits = 0, k = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new BackupError('corrupt');
    acc = (acc << B64_BITS) | v; bits += B64_BITS;
    if (bits >= BYTE_BITS) { bits -= BYTE_BITS; out[k++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  return out;
}
