import { haversine, type LatLng } from './geo';

export type ElevationProfile = { gainM: number; lossM: number; minM: number; maxM: number; /** Distance in km from the start, and height in metres. */ samples: { d: number; e: number }[] };

/** A rise or fall smaller than this is GPS and barometer noise, not climbing. */
const NOISE_M = 3;

/** Climb, descent and a profile to draw. Null when fewer than two points have a height. */
export function elevationProfile(points: LatLng[], maxSamples: number = 100): ElevationProfile | null {
  const pts: { d: number; e: number }[] = [];
  let d = 0;
  points.forEach((p, i) => {
    if (i > 0) d += haversine(points[i - 1], p);
    if (p.ele != null && Number.isFinite(p.ele)) pts.push({ d: d / 1000, e: p.ele });
  });
  if (pts.length < 2) return null;
  let gainM = 0, lossM = 0, anchor = pts[0].e;
  for (const { e } of pts) {
    if (e - anchor >= NOISE_M) { gainM += e - anchor; anchor = e; }
    else if (anchor - e >= NOISE_M) { lossM += anchor - e; anchor = e; }
  }
  const heights = pts.map((x) => x.e);
  const step = Math.max(1, Math.ceil(pts.length / maxSamples));
  const samples = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(({ d: km, e }) => ({ d: +km.toFixed(3), e: Math.round(e) }));
  return { gainM: Math.round(gainM), lossM: Math.round(lossM), minM: Math.round(Math.min(...heights)), maxM: Math.round(Math.max(...heights)), samples };
}
