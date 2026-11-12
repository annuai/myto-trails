import type { MarkId } from './marks';
import { useFixit, totalFixed } from '@/store/fixit';
import { useMarks } from '@/store/marks';
import { useRides } from '@/store/rides';
import { useStory } from '@/store/story';
import { markDef } from './marks';
import { markMoment, pickMoment, titleMoment, type Surface } from './story/moment';
import { monthsRidden, titleFor } from './story/titles';
import { whenHydrated, type Hydratable } from './whenHydrated';

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
  // The first look only records what the rider had already earned (marks and title), so an existing rider is not greeted with all of it.
  const storyQuiet = !useStory.getState().seeded;
  if (storyQuiet) useStory.getState().setSeeded();
  if (!marks.seeded) { marks.setSeeded(); return []; }
  const story = useStory.getState();
  story.queue([...(rose && !storyQuiet && story.title ? [titleMoment(story.title)] : []), ...fresh.flatMap((id) => { const d = markDef(id); return d ? [markMoment(id, d.title)] : []; })]);
  // Moments that lost an earlier pick wait in `pending` and come first.
  const picked = pickMoment(useStory.getState().pending, { surface, shownThisSession: story.shownThisSession, seen: story.seen });
  if (picked) { story.noteShown(picked.id); story.setLatest(picked, Date.now()); story.unqueue(picked.id); }
  return fresh;
}

/**
 * App open: syncs once story, rides, marks and fixes are all read from the phone, so the quiet first look never seeds on an empty ride list
 * (and later announces a title the rider already held) nor overwrites saved Moments. Returns a cancel.
 */
export function syncMarksWhenReady(stores: readonly Hydratable[] = [useStory, useRides, useMarks, useFixit]): () => void {
  return whenHydrated(stores, () => { syncMarks(); });
}

/** The rider marked a service item as done. */
export function noteServiceDone(): void {
  useMarks.getState().noteService();
  syncMarks();
}
