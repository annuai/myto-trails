import { initialFusion, stepFusion, type Activity, type Evidence } from './motionFusion';

export type Timeline = { t: number; state: Activity; confidence: number }[];
export type Truth = { from: number; to: number; state: 'moving' | 'stopped' | 'on_foot' }[];

/** Runs recorded or made-up evidence through the detector, one tick a second between events, and returns what it said when. */
export function replay(events: Evidence[]): Timeline {
  const out: Timeline = [];
  let s = initialFusion;
  const sorted = [...events].sort((a, b) => a.t - b.t);
  if (!sorted.length) return out;
  let nextTick = sorted[0]!.t;
  const push = (t: number) => out.push({ t, state: s.state, confidence: s.confidence });
  for (const e of sorted) {
    while (nextTick + 1000 < e.t) { nextTick += 1000; s = stepFusion(s, { k: 'tick', t: nextTick }); push(nextTick); }
    s = stepFusion(s, e);
    push(e.t);
    nextTick = Math.max(nextTick, e.t);
  }
  return out;
}

const group = (a: Activity): 'moving' | 'stopped' | 'on_foot' | 'unknown' => (a === 'riding' || a === 'crawling' ? 'moving' : a === 'stopped_brief' || a === 'stopped_parked' ? 'stopped' : a === 'on_foot' ? 'on_foot' : 'unknown');

/** Scores a timeline against what the rider said was true: seconds wrong, state changes, and how long each truth took to be seen. */
export function score(timeline: Timeline, truth: Truth) {
  let wrong = 0, total = 0, flips = 0, last = '';
  const delays: number[] = [];
  for (const seg of truth) {
    const inside = timeline.filter((p) => p.t >= seg.from && p.t < seg.to);
    for (const p of inside) { total++; if (group(p.state) !== seg.state) wrong++; }
    const hit = inside.find((p) => group(p.state) === seg.state);
    delays.push(hit ? hit.t - seg.from : seg.to - seg.from);
  }
  for (const p of timeline) { const g = group(p.state); if (last && g !== last && g !== 'unknown') flips++; if (g !== 'unknown') last = g; }
  return { wrongShare: total ? wrong / total : 0, flips, delays };
}
