import { candidates, type Candidate } from './candidates';
import { variants, write } from './copy';
import { admits } from './governor';
import { dormant, fatigued, resolveHistory, typeWeight } from './learning';
import { DAY, MIN } from './time';
import type { Nudge, NudgeType, NudgeWorld } from './types';

/** How far ahead nudges are planned. The lapse ladder and the first-ride nudges reach further, so they exist even if the app is not opened again. */
export const HORIZON_MS = 7 * DAY;
const LONG: NudgeType[] = ['lapse', 'first'];
/** A nudge is never planned closer than this to now. */
const LEAD_MS = 2 * MIN;

/** Wording `n` of a type: the next one after however many of that type have been shown, so the same line is not used twice in a row. */
const variantFor = (w: NudgeWorld, type: NudgeType): number => w.history.filter((h) => h.type === type).length % variants(type);

const toNudge = (c: Candidate, w: NudgeWorld): Nudge => {
  const v = variantFor(w, c.type);
  const words = write(c.type, c.data, v);
  return { id: `nudge:${c.type}:${c.key}:v${v}`, type: c.type, fireAt: c.fireAt, ...words, route: c.route, score: c.score };
};

/**
 * The nudges to schedule from now on, soonest first. Pure: the same rider and day always give the same plan.
 * Ideas come from the rider's situation (candidates), each is weighed by how well that type has worked for them, and the governor's hard
 * rules decide which are allowed, best first: a lower-scoring idea only gets in where it leaves the rules unbroken.
 */
export function planNudges(w: NudgeWorld): Nudge[] {
  if (w.level === 'off') return [];
  const resolved = resolveHistory(w.history, w.rides, w.now);
  const tired = fatigued(resolved);
  const ideas = candidates(w)
    .filter((c) => !w.muted.includes(c.type) && !dormant(resolved, c.type, w.now))
    .filter((c) => c.fireAt > w.now + LEAD_MS && (c.fireAt <= w.now + HORIZON_MS || LONG.includes(c.type)))
    .map((c) => ({ c, weight: c.score * typeWeight(resolved, c.type) }))
    .sort((a, b) => b.weight - a.weight || a.c.fireAt - b.c.fireAt);
  const accepted: Candidate[] = [];
  for (const { c } of ideas) if (admits(c, accepted, w, tired)) accepted.push(c);
  return accepted.sort((a, b) => a.fireAt - b.fireAt).map((c) => toNudge(c, w));
}
