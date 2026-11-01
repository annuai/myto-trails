import { haversine } from './geo';

/** A rider placed on the map: `slot` picks the colour. */
export type RiderMark = { id: string; name: string; slot: number; lat: number; lng: number };
/** Riders close enough on screen that their names would overlap, drawn as one. */
export type RiderCluster = { id: string; lat: number; lng: number; marks: RiderMark[] };

/** Riders closer than this many screen pixels share one marker: about the width of a name label. */
export const CLUSTER_PX = 72;

const metresPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

/**
 * Groups the riders whose markers would crowd each other at this zoom. Each rider joins the first group whose centre is
 * within `minPx` pixels, so the first rider in the list names the group. Zoom in and a group falls apart.
 */
export function clusterMarks(marks: RiderMark[], zoom: number, minPx = CLUSTER_PX): RiderCluster[] {
  const out: RiderCluster[] = [];
  for (const m of marks) {
    const near = out.find((c) => haversine(c, m) <= minPx * metresPerPixel(c.lat, zoom));
    if (!near) { out.push({ id: m.id, lat: m.lat, lng: m.lng, marks: [m] }); continue; }
    near.marks.push(m);
    near.lat = near.marks.reduce((s, x) => s + x.lat, 0) / near.marks.length;
    near.lng = near.marks.reduce((s, x) => s + x.lng, 0) / near.marks.length;
  }
  return out;
}

/** "Asha +2": the first rider's first name and how many others are with them. */
export const clusterLabel = (c: RiderCluster): string => `${c.marks[0]!.name.split(' ')[0]} +${c.marks.length - 1}`;
