const HOUR = 3_600_000;
const EARTH_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

type Point = { lat: number; lng: number };

/** Great-circle distance in metres. */
export function distanceM(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Check-in opens an hour before the start and closes six hours after it. */
export function checkInWindow(startsAt: Date, now: Date): "early" | "open" | "closed" {
  const t = now.getTime() - startsAt.getTime();
  if (t < -HOUR) return "early";
  return t > 6 * HOUR ? "closed" : "open";
}

export type CheckInVerdict = { ok: true } | { ok: false; reason: "early" | "closed" | "far" | "inaccurate" };

/** A fix that cannot tell whether the rider is inside the radius is refused rather than guessed at. */
export function checkInVerdict(ev: Point & { radiusM: number; startsAt: Date }, at: Point & { accuracyM: number }, now: Date): CheckInVerdict {
  const w = checkInWindow(ev.startsAt, now);
  if (w !== "open") return { ok: false, reason: w };
  if (at.accuracyM > ev.radiusM) return { ok: false, reason: "inaccurate" };
  return distanceM(ev, at) <= ev.radiusM ? { ok: true } : { ok: false, reason: "far" };
}

export const seatDecision = (goingCount: number, capacity: number | null): "going" | "waitlisted" => (capacity !== null && goingCount >= capacity ? "waitlisted" : "going");

/** An event starts in the future, and not more than 365 days away. */
export const validStart = (startsAt: Date, now: Date) => startsAt.getTime() > now.getTime() && startsAt.getTime() - now.getTime() < 366 * 86_400_000;
