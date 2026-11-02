import type { LatLng } from '@/lib/geo';
import type { RiderMark } from '@/lib/riderClusters';

export type OsmMapProps = {
  /** A height in points, or 'fill' to take all the room the parent leaves. */
  height: number | 'fill';
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
  /** The riders of a group ride: a coloured dot and name each. Riders too close together are drawn as one badge that lists them when tapped. */
  riderMarks?: RiderMark[];
  /** The group's destination, drawn as a pin. */
  destination?: LatLng & { name?: string };
  /** The road to the destination, drawn in blue. */
  guide?: LatLng[];
  /** The leader's regroup point. */
  regroup?: LatLng;
  /** Keep the camera on `position` (live riding). Otherwise the map fits line and track. */
  follow?: boolean;
  /** Fly the camera here when it changes (a place the rider searched for). */
  focus?: LatLng;
  /** Draw an arrow for the way the rider faces instead of a dot. Only while the camera follows and a `heading` is known, since the map is then turned to it. */
  pointer?: boolean;
  /** Turn the map so this bearing (degrees, 0 is north) points up. Only with `follow`; left as is when undefined. */
  heading?: number;
  /** Shows an enlarge button at the top right; it is called when pressed. */
  onFullscreen?: () => void;
  /** True while the map is the enlarged one: the button then shrinks it. */
  fullscreen?: boolean;
  dark?: boolean;
  radius?: number;
  /** False for a picture of the route: no gestures and no zoom buttons. Defaults to true. */
  interactive?: boolean;
};
