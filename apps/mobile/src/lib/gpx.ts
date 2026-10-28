import type { LatLng } from './geo';
import { segmentsOf } from './track';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildGpx(name: string, points: LatLng[], waypoints: { name: string; lat: number; lng: number }[] = [], breaks?: number[]): string {
  const wpts = waypoints.map((w) => `  <wpt lat="${w.lat.toFixed(6)}" lon="${w.lng.toFixed(6)}"><name>${esc(w.name)}</name></wpt>`).join('\n');
  const trkpt = (p: LatLng) => {
    const ele = p.ele != null ? `<ele>${p.ele.toFixed(1)}</ele>` : '';
    const time = p.t != null ? `<time>${new Date(p.t).toISOString()}</time>` : '';
    return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">${ele}${time}</trkpt>`;
  };
  const trksegs = segmentsOf(points, breaks).map((seg) => `    <trkseg>\n${seg.map(trkpt).join('\n')}\n    </trkseg>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Myto" xmlns="http://www.topografix.com/GPX/1/1">
${wpts ? wpts + '\n' : ''}  <trk>
    <name>${esc(name)}</name>
${trksegs}
  </trk>
</gpx>
`;
}
