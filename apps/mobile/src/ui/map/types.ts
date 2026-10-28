import type { LatLng } from '@/lib/geo';

export type OsmMapProps = {
  height: number;
  /** A route to follow or plan (a published trail). */
  line?: LatLng[];
  /** The recorded track, drawn as it grows. */
  track?: LatLng[];
  /** Where the rider is now. */
  position?: LatLng;
  waypoints?: LatLng[];
  /** Keep the camera on `position` (live riding). Otherwise the map fits line and track. */
  follow?: boolean;
  dark?: boolean;
  radius?: number;
  /** False for a picture of the route: no gestures and no zoom buttons. Defaults to true. */
  interactive?: boolean;
};
