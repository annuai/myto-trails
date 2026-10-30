import { stopBackground } from './backgroundLocation';
import { createFinisher } from './finishCore';
import { journal } from './journalStore';
import { companionLinks } from './rideLinks';
import { useCompanion } from '@/store/companion';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';

/** The persist middleware writes in the background; this waits for the saved rides to be on the phone before the journal is cleared. */
async function persistRides() {
  const o = useRides.persist.getOptions();
  const state = useRides.getState();
  await o.storage?.setItem(o.name as string, { state: o.partialize ? o.partialize(state) : state, version: o.version });
}

const finish = createFinisher({
  journal, stopBackground, persist: persistRides, now: Date.now,
  flush: () => useRecorder.getState().flush(),
  reset: () => useRecorder.getState().reset(),
  findSaved: (startedAt) => useRides.getState().rides.find((r) => r.startedAt === startedAt)?.id,
  addRide: (r, id) => useRides.getState().addRide(r, id),
});

/**
 * Save the recording on disk as a ride (see createFinisher). Returns undefined when there is nothing worth keeping.
 * The group ride and check-in are noted first, because the companion ends them as soon as recording stops.
 */
export async function finishRide(): Promise<string | undefined> {
  const { group, checkin } = useCompanion.getState();
  const links = companionLinks({ group, checkin });
  const id = await finish();
  if (id && links) useRides.getState().linkRide(id, links);
  return id;
}
