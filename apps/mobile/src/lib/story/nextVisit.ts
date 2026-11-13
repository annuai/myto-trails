import { greetingDue, DAY_MS, type GreetingState } from './greeting';
import type { PendingVisit } from '@/store/pillion';
import type { VisitId } from './visits';

/** What the app knows when it asks "does Pillion turn up now?". */
export type VisitCtx = {
  now: number;
  /** The rider is on Home, not in the middle of something. */
  home: boolean;
  /** A ride is being recorded or is paused. */
  riding: boolean;
  /** The welcome flow is finished. */
  onboarded: boolean;
  /** Something is already on screen, or a Moment was already shown this session (the story's one-a-session rule). */
  busy: boolean;
  greeting: GreetingState;
  pending?: PendingVisit;
  shown: Record<string, number>;
  /** The soonest planned trip, with its start date (YYYY-MM-DD). */
  trip?: { id: string; name: string; startDate?: string };
};

export type Next = { id: VisitId; key: string; trip?: { id: string; name: string } };

/** A finished ride stays worth a visit for a day. */
const PENDING_MS = DAY_MS;
/** A planned trip is looked at on the map when it is this close. */
const MAP_DAYS = 2;

const dayStart = (t: number) => new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();

/** At most one, and never on a ride, off Home or while another is showing. The greeting comes first, then a ride just finished, then a trip about to start. */
export function nextVisit(c: VisitCtx): Next | undefined {
  if (!c.home || c.riding || !c.onboarded || c.busy) return undefined;
  if (greetingDue(c.greeting, c.now) && !c.shown.hello) return { id: 'hello', key: 'hello' };
  const p = c.pending;
  if (p && c.now - p.at < PENDING_MS && !c.shown[p.key]) return { id: p.id, key: p.key };
  const t = c.trip;
  if (t?.startDate) {
    const [y, m, d] = t.startDate.split('-').map(Number);
    const days = Math.round((new Date(y, m - 1, d).getTime() - dayStart(c.now)) / DAY_MS);
    if (days >= 0 && days <= MAP_DAYS && !c.shown[`map:${t.id}`]) return { id: 'map', key: `map:${t.id}`, trip: { id: t.id, name: t.name } };
  }
  return undefined;
}

type Done = { id: string; startedAt: number; durationSec: number; sample?: boolean; simulated?: boolean };

/** Which visit a ride that has just finished earns: a long one is a rest, an evening one a campfire, any other a tired and happy dog. Nothing for an old, sample or simulated ride. */
export function visitForRide(r: Done, now: number): PendingVisit | undefined {
  if (r.sample || r.simulated) return undefined;
  const end = r.startedAt + r.durationSec * 1000;
  if (now - end > 10 * 60_000 || end > now + 60_000) return undefined;
  const hour = new Date(end).getHours();
  const id: VisitId = r.durationSec >= 3 * 3600 ? 'rest' : r.durationSec >= 1.5 * 3600 && hour >= 17 && hour < 23 ? 'campfire' : 'finished';
  return { id, key: `ride:${r.id}`, at: now };
}
