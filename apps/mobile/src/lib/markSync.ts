import type { MarkId } from './marks';
import { useFixit, totalFixed } from '@/store/fixit';
import { useMarks } from '@/store/marks';
import { useRides } from '@/store/rides';
import { useStory } from '@/store/story';
import { markDef } from './marks';
import { markMoment, pickMoment, titleMoment, type Moment, type Surface } from './story/moment';
import { monthsRidden, titleFor } from './story/titles';

/**
 * Looks at everything the rider has done, records any new marks and the rider title, and lets the governor pick at most one Moment to
 * show (on the ride-end screen or Dash). Safe to call often. `surface` is where the rider is when this runs.
 */
export function syncMarks(surface: Surface = 'dash'): MarkId[] {
  const marks = useMarks.getState();
  const rides = useRides.getState().rides;
  const fresh = marks.sync({ rides, servicesDone: marks.services, fixesDone: totalFixed(useFixit.getState().fixed) });
  const real = rides.filter((r) => !r.sample);
  const rose = useStory.getState().raiseTitle(titleFor({ rides: real.length, monthsRidden: monthsRidden(real), trailsRidden: new Set(real.map((r) => r.trailSlug).filter(Boolean)).size }));
  // The first look only records what the rider had already earned, so an existing rider is not greeted with every mark at once.
  if (!marks.seeded) { marks.setSeeded(); return []; }
  const story = useStory.getState();
  const candidates: Moment[] = [...(rose && story.title ? [titleMoment(story.title)] : []), ...fresh.flatMap((id) => { const d = markDef(id); return d ? [markMoment(id, d.title)] : []; })];
  const picked = pickMoment(candidates, { surface, shownThisSession: story.shownThisSession, seen: story.seen });
  if (picked) { story.noteShown(picked.id); story.setLatest(picked, Date.now()); }
  return fresh;
}

/** The rider marked a service item as done. */
export function noteServiceDone(): void {
  useMarks.getState().noteService();
  syncMarks();
}
