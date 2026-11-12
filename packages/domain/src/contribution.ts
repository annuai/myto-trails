import { DAY_MS } from "./time";

/**
 * The life of anything a rider contributes. The repo already has statuses for each kind of contribution; they map onto these six
 * (see `stateOf*`). Only two are not stored anywhere: Disputed and Outdated are derived from votes and age, never from a column.
 */
export const CONTRIBUTION_STATES = ["draft", "pending", "approved", "rejected", "disputed", "outdated"] as const;
export type ContributionState = (typeof CONTRIBUTION_STATES)[number];

export const CONTRIBUTION_EVENTS = ["submit", "request_changes", "withdraw", "approve", "reject", "dispute", "resolve_dispute", "expire", "refresh"] as const;
export type ContributionEvent = (typeof CONTRIBUTION_EVENTS)[number];

const NEXT: Record<ContributionState, Partial<Record<ContributionEvent, ContributionState>>> = {
  draft: { submit: "pending" },
  pending: { approve: "approved", reject: "rejected", request_changes: "draft", withdraw: "draft" },
  approved: { dispute: "disputed", expire: "outdated" },
  disputed: { resolve_dispute: "approved", reject: "rejected", expire: "outdated" },
  outdated: { refresh: "pending" },
  // Rejected is final: a rider who disagrees submits a new contribution.
  rejected: {},
};

/** The state after `event`, or null when that event is not allowed from `from`. */
export const transition = (from: ContributionState, event: ContributionEvent): ContributionState | null => NEXT[from][event] ?? null;

/** `submission.status`. Changes requested and withdrawn both return the work to its author, which is a draft. */
export function stateOfSubmission(status: string): ContributionState | null {
  switch (status) {
    case "draft": case "changes_requested": case "withdrawn": return "draft";
    case "submitted": return "pending";
    case "approved": return "approved";
    case "rejected": return "rejected";
    default: return null;
  }
}

/** `trail_report.status`. A report that duplicates another is not counted as verified. */
export function stateOfTrailReport(status: string): ContributionState | null {
  switch (status) {
    case "open": case "triaged": case "needs_info": return "pending";
    case "accepted": return "approved";
    case "rejected": case "duplicate_of_report": return "rejected";
    default: return null;
  }
}

/** A road-condition report is visible at once; riders then confirm or dispute it. It is hidden by moderators, never deleted. */
export const CONFIRMATIONS_TO_VERIFY = 2;
/** Same two weeks as `FRESH_DAYS` in the server's condition reports. */
export const CONDITION_FRESH_DAYS = 14;

export type ConditionEvidence = { hidden: boolean; confirmations: number; disputes: number; reportedAt: Date };
const isDisputed = (confirmations: number, disputes: number) => disputes >= CONFIRMATIONS_TO_VERIFY && disputes >= confirmations;

export function stateOfConditionReport(e: ConditionEvidence, now: Date): ContributionState {
  if (e.hidden) return "rejected";
  if (isDisputed(e.confirmations, e.disputes)) return "disputed";
  if (now.getTime() - e.reportedAt.getTime() > CONDITION_FRESH_DAYS * DAY_MS) return "outdated";
  return e.confirmations >= CONFIRMATIONS_TO_VERIFY ? "approved" : "pending";
}

export const TRUST_LABELS = ["community_reported", "recently_verified", "officially_confirmed", "outdated", "disputed"] as const;
export type TrustLabel = (typeof TRUST_LABELS)[number];
export const TRUST_TEXT: Record<TrustLabel, string> = {
  community_reported: "Community reported",
  recently_verified: "Recently verified",
  officially_confirmed: "Officially confirmed",
  outdated: "Outdated",
  disputed: "Disputed",
};

export type TrustInput = {
  /** Who is behind it. Only a moderator or an official source can ever be "Officially confirmed". */
  source: "rider" | "moderator" | "official";
  state: ContributionState;
  confirmations?: number;
  disputes?: number;
  reportedAt: Date;
  /** For moderator and official facts: when the confirmation stops being current. */
  validUntil?: Date | null;
  now: Date;
};

/**
 * What to call a piece of information. Disputed beats everything, then Outdated. A rider's report is never "Officially confirmed":
 * the best it can be is "Recently verified", which needs other riders to confirm it within two weeks. Returns null for
 * contributions that are not shown (draft, rejected).
 */
export function trustLabel(i: TrustInput): TrustLabel | null {
  if (i.state === "draft" || i.state === "rejected") return null;
  const confirmations = i.confirmations ?? 0, disputes = i.disputes ?? 0;
  if (i.state === "disputed" || isDisputed(confirmations, disputes)) return "disputed";
  if (i.state === "outdated") return "outdated";
  if (i.source === "rider") {
    if (i.now.getTime() - i.reportedAt.getTime() > CONDITION_FRESH_DAYS * DAY_MS) return "outdated";
    return confirmations >= CONFIRMATIONS_TO_VERIFY && confirmations > disputes ? "recently_verified" : "community_reported";
  }
  if (i.state !== "approved") return "community_reported";
  if (i.validUntil && i.now.getTime() > i.validUntil.getTime()) return "outdated";
  return "officially_confirmed";
}
