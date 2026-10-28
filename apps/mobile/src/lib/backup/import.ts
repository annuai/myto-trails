import { decrypt } from './crypto';
import { BackupError, parseEnvelope, type BackupPayload, type Snapshot } from './format';
import { assertPayload, migrate } from './migrate';

export type ImportMode = 'replace' | 'merge';
export type PhotoSink = {
  stage: (id: string, base64: string) => Promise<void>;
  commit: (mode: ImportMode) => void;
  discard: () => void;
};
/** The phone side of an import: read and write the stores, and the photo folder. */
export type Target = { get: () => Snapshot; set: (next: Snapshot) => void; photos: PhotoSink };

export async function openBackup(text: string, passphrase: string): Promise<BackupPayload> {
  const env = parseEnvelope(text);
  const plain = await decrypt(env.ciphertext, passphrase, env);
  let data: unknown;
  try { data = JSON.parse(new TextDecoder().decode(plain)); } catch { throw new BackupError('corrupt'); }
  const payload = migrate(data, env.version);
  assertPayload(payload);
  return payload;
}

export type Summary = { rides: number; todos: number; contacts: number; documents: number; photos: number };
export const summarize = (p: Snapshot): Summary => ({
  rides: p.rides.length, todos: p.todos.length, contacts: p.contacts.length,
  documents: (p.licence ? 1 : 0) + (p.vehicle ? 1 : 0), photos: p.photos.length,
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
const plain = (p: Snapshot): Snapshot => ({ licence: p.licence, vehicle: p.vehicle, contacts: p.contacts, medical: p.medical, photos: p.photos, todos: p.todos, rides: p.rides, bike: p.bike });

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
    bike: incoming.bike !== undefined && local.bike === undefined ? incoming.bike : local.bike,
  };
}

/** Replace keeps the demo ride, which is not the rider's data. */
export const replaceSnapshot = (local: Snapshot, incoming: Snapshot): Snapshot => ({
  ...plain(incoming), rides: [...local.rides.filter((r) => r.sample), ...incoming.rides],
});

/**
 * Works out the result first, writes the photos to a temporary folder, swaps them in, and only then changes the stores.
 * Any failure before the swap leaves the phone as it was.
 */
export async function applyBackup(payload: BackupPayload, mode: ImportMode, target: Target): Promise<void> {
  const next = mode === 'replace' ? replaceSnapshot(target.get(), payload) : mergeSnapshots(target.get(), payload);
  try {
    for (const [id, b64] of Object.entries(payload.photoFiles)) await target.photos.stage(id, b64);
    target.photos.commit(mode);
  } catch {
    target.photos.discard();
    throw new BackupError('apply-failed');
  }
  target.set(next);
}
