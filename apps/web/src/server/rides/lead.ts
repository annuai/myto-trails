import type { RiderTitle } from "./group-rides";

/**
 * Who leads a group ride when the leader cannot. All pure: the facts go in, the answer comes out, so the rules are tested without a database.
 *
 * A leader whose phone has died goes quiet. So does one who has only turned off mobile data or ridden through a dead zone, and that must
 * never cost them the lead. The difference is the battery they last reported: quiet with 4% left is a dead phone; quiet with 60% is not.
 */

/** A leader quiet this long, with a low battery, is taken to have dropped off. */
export const SILENT_PROMOTE_MS = 10 * 60_000;
/** A leader quiet this long, whatever their battery, may be taken over from by their backup, a marshal or a captain, who are offered a button for it. Never automatic. */
export const SILENT_OFFER_MS = 15 * 60_000;
/** At or below this, a phone that goes quiet is taken to have died. */
export const LOW_BATTERY_PCT = 7;
/** A rider heard from within this is there to take the lead. */
export const FRESH_MS = 5 * 60_000;

export type Candidate = { userId: string; titles: RiderTitle[]; joinedAt: Date; seenAt: Date | null };

const fresh = (c: Candidate, now: Date) => c.seenAt !== null && now.getTime() - c.seenAt.getTime() <= FRESH_MS;

/**
 * Whether the leader has dropped off: quiet for 10 minutes, and the last battery they reported was low and not charging. A leader who never
 * reported a battery is not judged by this rule (only the offer, below, applies to them).
 */
export function leaderDroppedOff(l: { seenAt: Date | null; battery: number | null; charging: boolean }, now: Date): boolean {
  if (l.battery === null || l.battery > LOW_BATTERY_PCT || l.charging || l.seenAt === null) return false;
  return now.getTime() - l.seenAt.getTime() >= SILENT_PROMOTE_MS;
}

/** Whether the leader has been out of contact long enough for the people next in line to be offered the lead. */
export const leaderQuietFor15 = (seenAt: Date | null, joinedAt: Date, now: Date): boolean => now.getTime() - (seenAt ?? joinedAt).getTime() >= SILENT_OFFER_MS;

/** Who is next in line for the lead: the leader's own choice, else a marshal, else a captain, else whoever has been in the group longest. Only riders heard from lately; never the leader. Null when there is nobody. */
export function pickSuccessor(riders: Candidate[], o: { successorId: string | null; leaderId: string; now: Date }): Candidate | null {
  const ok = riders.filter((r) => r.userId !== o.leaderId && fresh(r, o.now));
  return ok.find((r) => r.userId === o.successorId)
    ?? ok.find((r) => r.titles.includes("marshal"))
    ?? ok.find((r) => r.titles.includes("captain"))
    ?? [...ok].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]
    ?? null;
}

/** Who may take the lead from a leader who is out of contact: their backup, a marshal or a captain. */
export const mayTakeLead = (r: Pick<Candidate, "userId" | "titles">, successorId: string | null): boolean =>
  r.userId === successorId || r.titles.includes("marshal") || r.titles.includes("captain");
