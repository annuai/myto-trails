import { BackupError } from './format';

export interface ByteWriter { write(bytes: Uint8Array): Promise<void> }
/** Reads up to `n` bytes; fewer (or none) only at the end of the file. */
export interface ByteReader { read(n: number): Promise<Uint8Array> }

/** Marks a streamed backup (version 3 and later). Older backups are JSON text and start with `{`. */
export const MAGIC = new TextEncoder().encode('MYTO3\n');
/** A record larger than this is a damaged file, not a photo. */
const MAX_FRAME = 256 * 1024 * 1024;

export async function writeFrame(out: ByteWriter, payload: Uint8Array) {
  const head = new Uint8Array(4);
  new DataView(head.buffer).setUint32(0, payload.length);
  const frame = new Uint8Array(4 + payload.length);
  frame.set(head); frame.set(payload, 4);
  await out.write(frame);
}

export async function readExact(r: ByteReader, n: number): Promise<Uint8Array> {
  const out = new Uint8Array(n);
  let got = 0;
  while (got < n) {
    const chunk = await r.read(n - got);
    if (!chunk.length) throw new BackupError('corrupt');
    out.set(chunk, got); got += chunk.length;
  }
  return out;
}

/** The next record, or null at a clean end of file. */
export async function readFrame(r: ByteReader): Promise<Uint8Array | null> {
  const first = await r.read(4);
  if (!first.length) return null;
  const head = new Uint8Array(4);
  head.set(first);
  if (first.length < 4) head.set(await readExact(r, 4 - first.length), first.length);
  const len = new DataView(head.buffer).getUint32(0);
  if (len > MAX_FRAME) throw new BackupError('corrupt');
  return readExact(r, len);
}
