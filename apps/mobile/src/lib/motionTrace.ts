import type { Activity, Evidence } from './motionFusion';

/** One line of a motion trace: a piece of evidence and the state the detector gave after it. */
export type TraceLine = Evidence & { state?: Activity; conf?: number };

/** Ticks are left out: replaying regenerates them. One JSON object per line, so a long ride can be written as it goes. */
export const encodeTrace = (lines: TraceLine[]): string => lines.filter((l) => l.k !== 'tick').map((l) => JSON.stringify(l)).join('\n');

/** Reads a trace back into evidence for lib/motionReplay. Lines that are not valid are skipped. */
export function decodeTrace(text: string): Evidence[] {
  const out: Evidence[] = [];
  for (const line of text.split('\n')) {
    try {
      const e = JSON.parse(line) as Evidence;
      if (e && typeof e.t === 'number' && (e.k === 'gps' || e.k === 'shake' || e.k === 'os')) out.push(e);
    } catch { /* a cut-off last line */ }
  }
  return out;
}
