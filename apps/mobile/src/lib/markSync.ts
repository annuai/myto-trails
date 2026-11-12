import type { MarkId } from './marks';
import { useFixit, totalFixed } from '@/store/fixit';
import { useMarkToast } from '@/store/markToast';
import { useMarks } from '@/store/marks';
import { useRides } from '@/store/rides';

/** Looks at everything the rider has done, records any new marks, and queues them to be stamped on screen. Safe to call often. */
export function syncMarks(): MarkId[] {
  const marks = useMarks.getState();
  const fresh = marks.sync({ rides: useRides.getState().rides, servicesDone: marks.services, fixesDone: totalFixed(useFixit.getState().fixed) });
  // The first look only records what the rider had already earned, so an existing rider is not greeted with every mark at once.
  if (!marks.seeded) { marks.setSeeded(); return []; }
  if (fresh.length) useMarkToast.getState().push(fresh);
  return fresh;
}

/** The rider marked a service item as done. */
export function noteServiceDone(): void {
  useMarks.getState().noteService();
  syncMarks();
}
