/**
 * Local challenges are optional. Nothing counts toward one until the rider joins it, nothing is taken away for not joining, and none
 * is about speed, distance or a streak. Definitions are data; progress is a pure function of the contributions inside the window.
 */
export type ChallengeKind =
  /** Trails the rider rode for the first time (their own "I've ridden here"), inside the window and place. */
  | "new_trails"
  | "viewpoints"
  /** Trail reports, road-condition confirmations and corrections that were approved. */
  | "verifications"
  /** Every trail of a regional collection, ridden. */
  | "collection";

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
];

/** One countable thing the rider did. The server supplies these, already moderated. */
export type ChallengeEvent = { kind: ChallengeKind; at: Date; districtId?: string | null };

export type ChallengeProgress = { def: ChallengeDef; joined: boolean; state: "not_joined" | "locked" | "in_progress" | "complete"; current: number; target: number; fraction: number; hint: string };

const sameMonth = (a: Date, b: Date) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

export function challengeProgress(
  def: ChallengeDef,
  i: { joinedAt: Date | null; events: readonly ChallengeEvent[]; districtId?: string | null; now: Date },
): ChallengeProgress {
  const base = { def, joined: i.joinedAt !== null, target: def.target };
  if (def.needs) return { ...base, state: "locked", current: 0, fraction: 0, hint: "Not counted yet: waiting for more map data." };
  if (!i.joinedAt) return { ...base, state: "not_joined", current: 0, fraction: 0, hint: "Join to start counting. It is optional." };
  const joinedAt = i.joinedAt;
  const current = i.events.filter((e) =>
    e.kind === def.kind && e.at.getTime() >= joinedAt.getTime() && (!def.monthly || sameMonth(e.at, i.now)) && (def.scope === "any" || (i.districtId && e.districtId === i.districtId))).length;
  const done = current >= def.target;
  return { ...base, state: done ? "complete" : "in_progress", current: Math.min(current, def.target), fraction: Math.min(1, current / def.target), hint: done ? "Done. Well explored." : def.blurb };
}
