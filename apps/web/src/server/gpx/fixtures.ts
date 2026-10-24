export type P = { lat: number; lon: number; ele?: number; /** milliseconds since the epoch */ time?: number };

/** A straight track heading north from (lat, lon), `n` points about 111 m apart. */
export function line(n: number, start = { lat: 11.6, lon: 76.1 }, o: { step?: number; ele?: (i: number) => number | undefined; time?: (i: number) => number | undefined } = {}): P[] {
  const step = o.step ?? 0.001;
  return Array.from({ length: n }, (_, i) => ({ lat: start.lat + i * step, lon: start.lon, ele: o.ele?.(i), time: o.time?.(i) }));
}

export function makeGpx(points: P[], extra = ""): string {
  const pts = points
    .map((p) => `<trkpt lat="${p.lat}" lon="${p.lon}">${p.ele !== undefined ? `<ele>${p.ele}</ele>` : ""}${p.time !== undefined ? `<time>${new Date(p.time).toISOString()}</time>` : ""}</trkpt>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Test track</name><trkseg>${pts}</trkseg></trk>${extra}</gpx>`;
}
