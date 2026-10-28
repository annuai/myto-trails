import { buildRide } from './buildRide';
import { journal } from './journalStore';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';

/** Turn the recording on disk into a saved ride. Returns undefined when there is nothing worth keeping. The journal is emptied only after the ride is saved. */
export async function finishRide(): Promise<string | undefined> {
  useRecorder.getState().reset();
  const raw = await journal.read();
  const ride = raw ? buildRide(raw, Date.now()) : undefined;
  const id = ride ? useRides.getState().addRide(ride) : undefined;
  await journal.clear();
  return id;
}
