import { CONFIRMATIONS_TO_VERIFY, type ContributionState } from "./contribution";

/**
 * Trailmarks are a thank-you for contributing to the map. They are not money, cannot be bought, sold, transferred or cashed out,
 * and are not a cryptocurrency. They are never earned by speed, distance or time on the road.
 */
export const TRAILMARKS_NOTE = "Trailmarks are a thank-you for helping the map, not money or crypto. They can't be bought, sold or cashed out.";

export const TRAILMARK_ACTIONS = ["new_trail", "trail_photos", "trail_report", "condition_confirmed", "place_contribution", "correction"] as const;
export type TrailmarkAction = (typeof TRAILMARK_ACTIONS)[number];

export type TrailmarkRule = { points: number; /** Most awards of this kind in any 24 hours. */ dailyCap: number; label: string };

/** Configurable in one place: change a number here, not the code that awards. */
export const TRAILMARK_RULES: Record<TrailmarkAction, TrailmarkRule> = {
  new_trail: { points: 100, dailyCap: 3, label: "Approved new trail" },
  trail_photos: { points: 20, dailyCap: 5, label: "Useful trail photographs" },
  trail_report: { points: 25, dailyCap: 5, label: "Verified trail report" },
  condition_confirmed: { points: 25, dailyCap: 5, label: "Confirmed road-condition report" },
  place_contribution: { points: 20, dailyCap: 5, label: "Useful place contribution" },
  correction: { points: 15, dailyCap: 5, label: "Correction of inaccurate information" },
};

export type AwardRequest = {
  action: TrailmarkAction;
  /** Where the contribution stands after moderation or verification. Only Approved earns anything. */
  state: ContributionState;
  /** Who is being awarded. */
  userId: string;
  /** Who decided or confirmed: a moderator, or the riders who confirmed. Never the contributor. */
  confirmedBy: readonly string[];
  /** Awards of this action to this rider in the last 24 hours. */
  awardedToday: number;
  /** True when this exact contribution has already been awarded (the ledger also enforces it). */
  alreadyAwarded: boolean;
};

export type AwardDecision = { award: true; points: number } | { award: false; reason: "not_approved" | "self_confirmed" | "not_enough_confirmations" | "daily_cap" | "already_awarded" };

/**
 * Whether a contribution earns Trailmarks right now. Pure: the server gathers the facts, this decides. Rejected, outdated,
 * disputed, pending and draft contributions earn nothing, and a rider cannot confirm their own work.
 */
export function decideAward(r: AwardRequest, rules: Record<TrailmarkAction, TrailmarkRule> = TRAILMARK_RULES): AwardDecision {
  if (r.state !== "approved") return { award: false, reason: "not_approved" };
  const others = new Set(r.confirmedBy.filter((id) => id !== r.userId));
  if (others.size === 0 && r.confirmedBy.length > 0) return { award: false, reason: "self_confirmed" };
  if (others.size < (r.action === "condition_confirmed" ? CONFIRMATIONS_TO_VERIFY : 1)) return { award: false, reason: "not_enough_confirmations" };
  if (r.alreadyAwarded) return { award: false, reason: "already_awarded" };
  if (r.awardedToday >= rules[r.action].dailyCap) return { award: false, reason: "daily_cap" };
  return { award: true, points: rules[r.action].points };
}

export type TrailmarkEvent = { action: TrailmarkAction; points: number; awardedAt: Date };

/** Running total of a ledger. */
export const trailmarkTotal = (events: readonly { points: number }[]) => events.reduce((n, e) => n + e.points, 0);
