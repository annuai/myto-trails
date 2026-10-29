import { addUserInteractionListener } from 'expo-widgets';
import { isRideAction, type RideActionId } from './rideActions';

/** Calls `on` when the rider presses a button on the ride card. The card's buttons are named by their action ids. */
export function onSurfaceAction(on: (id: RideActionId) => void): () => void {
  const sub = addUserInteractionListener((e) => { if (isRideAction(e.target)) on(e.target); });
  return () => sub.remove();
}
