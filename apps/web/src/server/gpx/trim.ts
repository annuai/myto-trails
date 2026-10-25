export type TrimPoint = { lat: number; lon: number; ele?: number };

const R = 6371;
function km(a: TrimPoint, b: TrimPoint): number {
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((b.lon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Cuts the first and last stretch (by distance along the track) off a recorded line. Used before publishing a
 * track that starts or ends at someone's home or another private place.
 */
export function trimTrack(points: TrimPoint[], cut: { startKm: number; endKm: number }): TrimPoint[] {
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1]! + km(points[i - 1]!, points[i]!));
  const total = along[along.length - 1] ?? 0;
  const out = points.filter((_, i) => along[i]! >= cut.startKm && along[i]! <= total - cut.endKm);
  if (out.length < 2) throw new Error(`Trimming ${cut.startKm} km and ${cut.endKm} km leaves nothing left of a ${total.toFixed(1)} km track`);
  return out.map((p) => ({ ...p }));
}
