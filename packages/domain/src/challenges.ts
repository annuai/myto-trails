/**
 * Local challenges are optional. Nothing counts toward one until the rider joins it, nothing is taken away for not joining, and none
 * is about speed or a streak; a distance challenge is only ever against your own best. Definitions are data; progress is a pure function of the contributions inside the window.
 */
export type ChallengeKind =
  /** Trails the rider rode for the first time (their own "I've ridden here"), inside the window and place. */
  | "new_trails"
  | "viewpoints"
  /** Trail reports, road-condition confirmations and corrections that were approved. */
  | "verifications"
  /** Every trail of a regional collection, ridden. */
  | "collection"
  /** Rides from the rider's own opted-in ride summaries. */
  | "rides"
  /** A ride longer than the rider's own previous best. Never compared with anyone else. */
  | "longest_ride";

export type ChallengeDef = {
  id: string;
  title: string;
  blurb: string;
  kind: ChallengeKind;
  target: number;
  /** Counts only in the rider's own district when true. */
  scope: "district" | "any";
  /** Resets each calendar month when true; otherwise open-ended. */
  monthly: boolean;
  /** Not computable yet: stays locked with this hint. */
  needs?: string;
};

export const CHALLENGES: readonly ChallengeDef[] = [
  { id: "discover-3-district", title: "Discover 3 new trails in your district", blurb: "Ride three trails near home that you have not ridden before, this month.", kind: "new_trails", target: 3, scope: "district", monthly: true },
  { id: "verify-10", title: "10 trail verifications", blurb: "Help keep the map true: get ten reports, confirmations or corrections accepted.", kind: "verifications", target: 10, scope: "any", monthly: false },
  { id: "viewpoints-5", title: "Visit 5 scenic viewpoints", blurb: "Stop and look. Five viewpoints, at your own pace.", kind: "viewpoints", target: 5, scope: "any", monthly: false, needs: "viewpoint_visits" },
  { id: "collection-finish", title: "Finish a regional collection", blurb: "Ride every trail in one regional collection.", kind: "collection", target: 1, scope: "any", monthly: false, needs: "trail_collections" },
  { id: "rides-in-region", title: "Ride 4 times this month", blurb: "Four rides this month, at your own pace.", kind: "rides", target: 4, scope: "any", monthly: true },
  { id: "longest-ride-region", title: "Beat your longest ride this month", blurb: "One ride longer than your own previous best.", kind: "longest_ride", target: 1, scope: "any", monthly: true },
];

/** One countable thing the rider did. The server supplies these, already moderated. */
export type ChallengeEvent = { kind: ChallengeKind; at: Date; districtId?: string | null };

export type ChallengeProgress = { def: ChallengeDef; joined: boolean; state: "not_joined" | "locked" | "in_progress" | "complete"; current: number; target: number; fraction: number; hint: string };

const sameMonth = (a: Date, b: Date) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

export function challengeProgress(
  def: ChallengeDef,
  i: { joinedAt: Date | null; events: readonly ChallengeEvent[]; districtId?: string | null; now: Date; rideOptIn?: boolean },
): ChallengeProgress {
  const base = { def, joined: i.joinedAt !== null, target: def.target };
  if (def.needs) return { ...base, state: "locked", current: 0, fraction: 0, hint: "Not counted yet: waiting for more map data." };
  if ((def.kind === "rides" || def.kind === "longest_ride") && !i.rideOptIn) return { ...base, state: "locked", current: 0, fraction: 0, hint: "Turn on ride comparison to count rides" };
  if (!i.joinedAt) return { ...base, state: "not_joined", current: 0, fraction: 0, hint: "Join to start counting. It is optional." };
  const joinedAt = i.joinedAt;
  // Ride days are dates (UTC midnight), so a ride on the day of joining counts: compare against the start of that UTC day.
  const rideKind = def.kind === "rides" || def.kind === "longest_ride";
  const from = rideKind ? Date.UTC(joinedAt.getUTCFullYear(), joinedAt.getUTCMonth(), joinedAt.getUTCDate()) : joinedAt.getTime();
  const current = i.events.filter((e) =>
    e.kind === def.kind && e.at.getTime() >= from && (!def.monthly || sameMonth(e.at, i.now)) && (def.scope === "any" || (i.districtId && e.districtId === i.districtId))).length;
  const done = current >= def.target;
  return { ...base, state: done ? "complete" : "in_progress", current: Math.min(current, def.target), fraction: Math.min(1, current / def.target), hint: done ? "Done. Well explored." : def.blurb };
}

/**
 * Events from a rider's own ride summaries: one `rides` event per ride, and a `longest_ride` event only for a ride longer than every
 * earlier one (the first ride has nothing to beat). Pure; the server passes only rows of a rider who has opted in.
 */
export function rideChallengeEvents(rows: readonly { rideRef: string; day: Date; distanceKm: number }[]): ChallengeEvent[] {
  const sorted = [...rows].sort((a, b) => a.day.getTime() - b.day.getTime() || (a.rideRef < b.rideRef ? -1 : a.rideRef > b.rideRef ? 1 : 0));
  const out: ChallengeEvent[] = [];
  let best: number | null = null;
  for (const r of sorted) {
    out.push({ kind: "rides", at: r.day });
    if (best !== null && r.distanceKm > best) out.push({ kind: "longest_ride", at: r.day });
    if (best === null || r.distanceKm > best) best = r.distanceKm;
  }
  return out;
}
