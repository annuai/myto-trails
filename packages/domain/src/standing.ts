// Standing: where a rider sits against a cohort. Never ranks speed; never
// shows a percentile for a cohort smaller than MIN_COHORT.

export const STANDING_METRICS = ["distance_km", "rides", "longest_ride_km"] as const;
export type StandingMetric = (typeof STANDING_METRICS)[number];

export const MIN_COHORT = 20;

// Not the leaderboard's regex: that one also refuses "distance", which standing allows.
// Matched on whole tokens (split on non-letters), so "workspace" or "overlap" stay unknown.
const REFUSED_TOKENS = new Set(["speed", "fast", "pace", "lap", "streak"]);
const isRefused = (raw: string) =>
  raw
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((t) => REFUSED_TOKENS.has(t));

export function parseStandingMetric(
  raw: unknown,
): { ok: true; metric: StandingMetric } | { ok: false; reason: "refused" | "unknown" } {
  if (typeof raw === "string") {
    const hit = STANDING_METRICS.find((m) => m === raw);
    if (hit) return { ok: true, metric: hit };
    if (isRefused(raw)) return { ok: false, reason: "refused" };
  }
  return { ok: false, reason: "unknown" };
}

/** n riders and the 9 ascending cut points at 10%..90%. */
export type CohortRow = { n: number; deciles: number[] };

/**
 * Whole percent of riders at or below `value`. Decile k (1-based) sits at k*10%;
 * a value >= decile k is at least k*10 (ties count as at or below). Between
 * deciles k and k+1 it moves linearly from k*10 to (k+1)*10. Below the first
 * decile the answer is capped at 10 (we do not know the minimum); above the
 * last decile it reads 100 by design (strictly above the last cut point). Flat (tied) deciles take the highest matching k.
 */
export function percentileBelow(value: number, row: CohortRow): number | null {
  if (!(row.n >= MIN_COHORT) || !Number.isFinite(value)) return null;
  const d = row.deciles;
  if (!Array.isArray(d) || d.length !== 9 || !d.every(Number.isFinite)) return null;
  const at = (i: number) => d[i] as number;
  if (value < at(0)) return 10;
  if (value > at(8)) return 100;
  let k = 0; // highest 0-based index with d[k] <= value
  while (k < 8 && at(k + 1) <= value) k++;
  const base = (k + 1) * 10;
  if (k === 8 || value === at(k)) return base;
  const frac = (value - at(k)) / (at(k + 1) - at(k));
  return Math.round(base + frac * 10);
}

/** 1 degree grid cell id: "<floor lat>:<floor lng>" (avoids shipping state boundaries). */
export function cellOf(lat: number, lng: number): string {
  return `${Math.floor(lat)}:${Math.floor(lng)}`;
}

export function bandOf(percent: number): string {
  if (percent >= 90) return "top 10%";
  if (percent >= 75) return "top 25%";
  if (percent >= 50) return "top half";
  return "riding along";
}
