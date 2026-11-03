import { useOsm, sharingOn } from '@/store/osm';
import { useRides } from '@/store/rides';
import { osmConfigured, traceFor, worthSharing } from './osm';
import { hasOsmToken, uploadTrace } from './osmApi';

/** A finished ride goes in the queue when the rider has said yes and it is worth sharing; `recordedByGps` is false for a simulated ride. */
export function queueRideForOsm(rideId: string, recordedByGps: boolean): void {
  const osm = useOsm.getState();
  if (!osmConfigured() || !sharingOn(osm)) return;
  const ride = useRides.getState().rides.find((r) => r.id === rideId);
  if (ride && worthSharing(ride, recordedByGps)) { osm.queue(rideId); void shareQueued(); }
}

let sending = false;

/**
 * Sends what is waiting: each ride as a trimmed trace under the rider's own OpenStreetMap account. A ride that cannot be sent for lack
 * of a connection stays queued for the next try; one OpenStreetMap refuses is dropped; a lapsed sign-in stops everything and shows as
 * "not connected" so the rider can sign in again.
 */
export async function shareQueued(): Promise<void> {
  if (sending || !osmConfigured() || !sharingOn(useOsm.getState())) return;
  sending = true;
  try {
    if (!useOsm.getState().connected || !(await hasOsmToken())) { useOsm.getState().setConnected(false); return; }
    for (const id of [...useOsm.getState().pending]) {
      const ride = useRides.getState().rides.find((r) => r.id === id);
      const trace = ride ? traceFor(ride) : undefined;
      if (!trace) { useOsm.getState().settle(id, false); continue; }
      const result = await uploadTrace(trace.gpx);
      if (result === 'sent') useOsm.getState().settle(id, true);
      else if (result === 'refused') useOsm.getState().settle(id, false);
      else { if (result === 'auth') useOsm.getState().setConnected(false); return; }
    }
  } finally { sending = false; }
}
