import type { LatLng } from '@/lib/geo';

export type OsmMapProps = {
  height: number;
  /** A route to follow or plan (a published trail). */
  line?: LatLng[];
  /** The recorded track, drawn as it grows. */
  track?: LatLng[];
  /** Indices into `track` where a new GPS segment starts; no line is drawn across a gap. */
  trackBreaks?: number[];
  /** Where the rider is now. */
  position?: LatLng;
  waypoints?: LatLng[];
  /** Called with the spot the rider tapped, for building a route. */
  onTap?: (p: LatLng) => void;
  /** The other riders of a group ride. */
  riders?: LatLng[];
  /** The leader's regroup point. */
  regroup?: LatLng;
  /** Keep the camera on `position` (live riding). Otherwise the map fits line and track. */
  follow?: boolean;
  /** Fly the camera here when it changes (a place the rider searched for). */
  focus?: LatLng;
  dark?: boolean;
  radius?: number;
  /** False for a picture of the route: no gestures and no zoom buttons. Defaults to true. */
  interactive?: boolean;
};
