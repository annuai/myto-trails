import { stopBackground } from './backgroundLocation';
import { createFinisher } from './finishCore';
import { journal } from './journalStore';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';

/** The persist middleware writes in the background; this waits for the saved rides to be on the phone before the journal is cleared. */
async function persistRides() {
  const o = useRides.persist.getOptions();
  const state = useRides.getState();
  await o.storage?.setItem(o.name as string, { state: o.partialize ? o.partialize(state) : state, version: o.version });
}

/** Save the recording on disk as a ride (see createFinisher). Returns undefined when there is nothing worth keeping. */
export const finishRide = createFinisher({
  journal, stopBackground, persist: persistRides, now: Date.now,
  flush: () => useRecorder.getState().flush(),
  reset: () => useRecorder.getState().reset(),
  findSaved: (startedAt) => useRides.getState().rides.find((r) => r.startedAt === startedAt)?.id,
  addRide: (r) => useRides.getState().addRide(r),
});
