import type { LatLng } from '@/lib/geo';
import type { HeatMap } from '@/lib/heat';
import type { RiderMark } from '@/lib/riderClusters';

export type OsmMapProps = {
  /** A height in points, or 'fill' to take all the room the parent leaves. */
  height: number | 'fill';
  /** A route to follow or plan (a published trail). */
  line?: LatLng[];
  /** A heat map under everything else: the rider's own tracks cut by how often each stretch was ridden, and a glow of the places ridden. The map fits it when nothing else is given to fit. */
  heat?: HeatMap;
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
  /** Open centred here and let the rider move the map about freely, for choosing a spot: `onCenter` says where the middle of the map is. The screen draws the pin over the middle. */
  pickFrom?: LatLng;
  /** Called with the middle of the map when it stops moving. */
  onCenter?: (p: LatLng) => void;
  /** Draw an arrow for the way the rider faces instead of a dot, once a `heading` is known. It points at the heading whatever the map's own turn. */
  pointer?: boolean;
  /** The heading the arrow shows, close to the truth. The map turns to `heading`, which follows it a little behind, so the arrow swings into a corner first. */
  arrowHeading?: number;
  /** How long, in milliseconds, the camera takes to glide to the next position while it follows: the time between fixes, so the movement is steady rather than stop and go. */
  glideMs?: number;
  /** Show a line of numbers over the map (the heading, the arrow, how the map is turned, whether it follows), for finding out why it faces the wrong way. */
  debug?: boolean;
  /** Turn the map so this bearing (degrees, 0 is north) points up. Only with `follow`; left as is when undefined. */
  heading?: number;
  /** Pixels at the top, bottom and left of the view that things floating over the map cover. The camera keeps the rider in the clear part between them, and the map's own buttons and credit sit above the bottom one. */
  covered?: { top: number; bottom: number; left?: number };
  /** Called with true while the list of riders in a tapped badge is open, and false when it closes: the screen hides what floats over the map so the list is not covered. */
  onPicker?: (open: boolean) => void;
  /** Shows an enlarge button at the top right; it is called when pressed. */
  onFullscreen?: () => void;
  /** True while the map is the enlarged one: the button then shrinks it. */
  fullscreen?: boolean;
  dark?: boolean;
  radius?: number;
  /** False for a picture of the route: no gestures and no zoom buttons. Defaults to true. */
  interactive?: boolean;
};
