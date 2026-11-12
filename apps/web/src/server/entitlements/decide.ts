/** The rules for entitlements as pure functions, so they can be tested without a database. The SQL in entitlements.ts only applies what these decide. */
export type EntitlementKind = "large_ride_pass" | "organiser";
export type EntitlementStatus = "pending" | "active" | "failed" | "cancelled" | "refunded";

/** A provider-neutral billing event. Whichever store or gateway is used later maps its own notifications onto this. */
export type BillingEvent = {
  provider: string;
  providerRef: string;
  userId: string;
  kind: EntitlementKind;
  rideId?: string | null;
  type: "paid" | "failed" | "cancelled" | "refunded";
  endsAt?: Date | null;
};

export type Invalid = "invalid_kind" | "needs_ride" | "not_ride_leader" | "needs_end_date" | "end_in_past" | "bad_event";

const STATUS_OF: Record<BillingEvent["type"], EntitlementStatus> = { paid: "active", failed: "failed", cancelled: "cancelled", refunded: "refunded" };

/** A pass belongs to one ride its holder leads; Organiser belongs to the rider and must end. `leaderId` is the ride's leader, or null if there is no such ride. */
export function validateEntitlement(i: { userId: string; kind: string; rideId?: string | null; leaderId: string | null; endsAt?: Date | null; now: Date; requireFutureEnd: boolean }): Invalid | null {
  if (i.kind === "large_ride_pass") {
    if (!i.rideId) return "needs_ride";
    return i.leaderId === i.userId ? null : "not_ride_leader";
  }
  if (i.kind === "organiser") {
    if (!i.endsAt || Number.isNaN(i.endsAt.getTime())) return "needs_end_date";
    return i.requireFutureEnd && i.endsAt <= i.now ? "end_in_past" : null;
  }
  return "invalid_kind";
}

export type Decision = { action: "insert"; status: EntitlementStatus } | { action: "update"; status: EntitlementStatus } | { action: "noop" };

/**
 * What a billing event does to the row with the same (provider, providerRef), or to nothing if there is none yet.
 * Replaying an event changes nothing. Refunded is final, so a late 'paid' cannot bring a refunded purchase back, and a
 * 'paid' that arrives after a cancel is ignored too. A late 'failed' never takes away something already paid for.
 * An event for a purchase we have not seen is recorded as it says, so an out-of-order refund is not lost.
 */
export function decideEvent(current: EntitlementStatus | null, type: BillingEvent["type"]): Decision {
  const next = STATUS_OF[type];
  if (current === null) return { action: "insert", status: next };
  if (current === next || current === "refunded") return { action: "noop" };
  switch (type) {
    case "paid": return current === "pending" || current === "failed" ? { action: "update", status: next } : { action: "noop" };
    case "failed": return current === "pending" ? { action: "update", status: next } : { action: "noop" };
    case "cancelled": return current === "pending" || current === "active" ? { action: "update", status: next } : { action: "noop" };
    case "refunded": return current === "failed" ? { action: "noop" } : { action: "update", status: next };
  }
}

/** The date `months` calendar months after `from`, in UTC, stopping at the end of a shorter month (31 Jan + 1 month is 28 Feb, not 3 Mar). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}
