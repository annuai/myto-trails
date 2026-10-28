import { trimEnds, type LatLng } from './geo';

export { trimEnds };

/** How much of each end of a ride is left out of anything shared (a card, a route link): enough to hide a home or workplace. */
export const SHARE_TRIM_M = 300;

/** A track as it may be shown to other people. Empty when the ride is too short to share without giving away where it began. */
export const forSharing = (points: LatLng[]): LatLng[] => trimEnds(points, SHARE_TRIM_M);
