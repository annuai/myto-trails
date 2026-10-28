import { BackupError, CURRENT_VERSION, type BackupPayload } from './format';

/** `migrations[n]` turns a version n payload into a version n + 1 payload. Add one with every format change. */
export type Migrations = Record<number, (payload: any) => any>;
export const migrations: Migrations = {};

export function migrate(payload: unknown, from: number, to = CURRENT_VERSION, steps: Migrations = migrations): BackupPayload {
  if (from > to) throw new BackupError('newer-version');
  let data = payload;
  for (let v = from; v < to; v++) {
    const step = steps[v];
    if (!step) throw new BackupError('corrupt');
    data = step(data);
  }
  return data as BackupPayload;
}

/** Shape check after decrypting, so a payload that passed authentication but is not ours is refused before anything is applied. */
export function assertPayload(p: unknown): asserts p is BackupPayload {
  const x = p as Partial<BackupPayload> | null;
  const ok = !!x && Array.isArray(x.contacts) && Array.isArray(x.todos) && Array.isArray(x.rides) && Array.isArray(x.photos)
    && typeof x.medical === 'object' && x.medical !== null && typeof x.photoFiles === 'object' && x.photoFiles !== null
    && x.photos.every((ph) => typeof ph?.id === 'string' && typeof x.photoFiles?.[ph.id] === 'string');
  if (!ok) throw new BackupError('corrupt');
}
