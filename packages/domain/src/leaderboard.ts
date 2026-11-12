/**
 * Leaderboards rank contribution, never riding. The metrics are a closed list; anything about speed or distance is refused by name.
 * Only riders who opted in appear, by their public name, and no position is ever part of an entry.
 */
export const LEADERBOARD_METRICS = ["verified_contributions", "new_discoveries", "exploration_diversity", "helpful_contributions", "challenge_participation"] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

export const LEADERBOARD_SCOPES = ["india", "state", "district", "collection"] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];

const REFUSED = /speed|fast|distance|km|mile|top[_ -]?speed|lap|time|streak|elevation|climb/i;

export type MetricParse = { ok: true; metric: LeaderboardMetric } | { ok: false; reason: "refused" | "unknown" };

/** A ranking by speed or distance is refused outright (not merely unknown), so the API can say why. */
export function parseLeaderboardMetric(raw: unknown): MetricParse {
  if (typeof raw !== "string") return { ok: false, reason: "unknown" };
  if ((LEADERBOARD_METRICS as readonly string[]).includes(raw)) return { ok: true, metric: raw as LeaderboardMetric };
  return { ok: false, reason: REFUSED.test(raw) ? "refused" : "unknown" };
}

/** One rider's counts as the server has them, before ranking. `optedIn` is the rider's own choice and defaults to false. */
export type RankableRider = { publicName: string; publicId: string; optedIn: boolean; counts: Record<LeaderboardMetric, number> };
export type LeaderboardEntry = { rank: number; name: string; id: string; value: number };

export const LEADERBOARD_SIZE = 20;

/** Opted-in riders with a non-zero count, highest first, ties sharing a rank and ordered by name so the order is stable. */
export function rankRiders(riders: readonly RankableRider[], metric: LeaderboardMetric, size = LEADERBOARD_SIZE): LeaderboardEntry[] {
  const rows = riders.filter((r) => r.optedIn && r.counts[metric] > 0).sort((a, b) => b.counts[metric] - a.counts[metric] || a.publicName.localeCompare(b.publicName));
  let rank = 0, prev = NaN;
  return rows.slice(0, size).map((r, i) => {
    if (r.counts[metric] !== prev) { rank = i + 1; prev = r.counts[metric]; }
    return { rank, name: r.publicName, id: r.publicId, value: r.counts[metric] };
  });
}
