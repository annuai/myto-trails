import { finishRide } from '@/lib/finishRide';
import { queueRideForOsm } from '@/lib/osmShare';
import { useRecorder } from '@/store/recorder';
import { useTrips } from '@/store/trips';

/** Ends the ride the same way for Stop and for auto-end. Returns the saved ride's id, or undefined when it could not be written. */
export async function endRide(): Promise<string | undefined> {
  const recordedByGps = useRecorder.getState().source === 'gps';
  // If the ride could not be written, it stays on the phone and Home offers it back for saving.
  const id = await finishRide().catch(() => undefined);
  // A ride recorded while a trip is under way belongs to it.
  if (id) useTrips.getState().attachToActive(id);
  // With the rider's yes, the route goes to OpenStreetMap, trimmed and anonymous. A simulated ride never does.
  if (id) queueRideForOsm(id, recordedByGps);
  return id;
}
