import type { LatLon } from "./analyze";

export type GpxPoint = LatLon & { ele?: number };

const INVALID_XML_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;
const esc = (s: string) =>
  s.replace(INVALID_XML_CHARS, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const r5 = (n: number) => String(Number(n.toFixed(5)));
const r1 = (n: number) => String(Number(n.toFixed(1)));

/**
 * Plain GPX 1.1 without extensions (docs/14 §4). Coordinates are rounded to 5 decimals (about 1 m) and every
 * text value is escaped, so nothing in the output can carry markup.
 */
export function writeGpx(i: {
  name: string;
  description?: string;
  link?: string;
  copyright?: string;
  points: GpxPoint[];
  waypoints: (LatLon & { name: string })[];
}): string {
  const meta = [
    `<name>${esc(i.name)}</name>`,
    i.description ? `<desc>${esc(i.description)}</desc>` : "",
    i.copyright ? `<copyright author="${esc(i.copyright)}"/>` : "",
    i.link ? `<link href="${esc(i.link)}"><text>${esc(i.name)}</text></link>` : "",
  ].join("");
  const wpts = i.waypoints.map((w) => `<wpt lat="${r5(w.lat)}" lon="${r5(w.lon)}"><name>${esc(w.name)}</name></wpt>`).join("");
  const trkpts = i.points
    .map((p) => `<trkpt lat="${r5(p.lat)}" lon="${r5(p.lon)}">${p.ele !== undefined ? `<ele>${r1(p.ele)}</ele>` : ""}</trkpt>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Moto Trails" xmlns="http://www.topografix.com/GPX/1/1"><metadata>${meta}</metadata>${wpts}<trk><name>${esc(i.name)}</name><trkseg>${trkpts}</trkseg></trk></gpx>\n`;
}
