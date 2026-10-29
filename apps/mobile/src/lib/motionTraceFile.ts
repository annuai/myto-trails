import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Evidence, Fusion } from './motionFusion';
import { encodeTrace, type TraceLine } from './motionTrace';
import { useTraceSetting } from '@/store/trace';

const NAME = 'motion-trace.jsonl';
const FLUSH_MS = 30_000;
let lines: TraceLine[] = [];
let flushedAt = 0;
const file = () => new File(Paths.document, NAME);

/** A ride starts: the last trace is replaced. Only the latest ride is kept. */
export function traceBegin() { lines = []; flushedAt = Date.now(); }

/** Called with each piece of evidence and the detector's answer; a no-op unless the rider turned traces on. */
export function traceLog(e: Evidence, after: Fusion) {
  if (Platform.OS === 'web' || !useTraceSetting.getState().on || e.k === 'tick') return;
  lines.push({ ...e, state: after.state, conf: Math.round(after.confidence * 100) / 100 });
  if (Date.now() - flushedAt >= FLUSH_MS) traceEnd();
}

/** Writes what has been collected so far. */
export function traceEnd() {
  flushedAt = Date.now();
  if (Platform.OS === 'web' || !lines.length) return;
  try { const f = file(); f.create({ overwrite: true }); f.write(encodeTrace(lines)); } catch { /* a trace is a convenience: never break a ride for it */ }
}

export const traceExists = () => Platform.OS !== 'web' && file().exists;
export function traceDelete() { lines = []; try { if (file().exists) file().delete(); } catch { /* nothing to remove */ } }

/** Opens the share sheet with the last trace. It holds the route taken, so the rider chooses where it goes. */
export async function traceShare(): Promise<boolean> {
  if (!traceExists() || !(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file().uri, { dialogTitle: 'Share the motion trace', UTI: 'public.json' });
  return true;
}
