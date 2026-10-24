import type { OperationalStatus } from "./enums";
import { endOfValidity } from "./time";

/** A temporary closure past its expected end no longer counts as a known closure. */
export function effectiveCondition(
  e: { status: OperationalStatus; expectedUntil: string | null } | null,
  now: Date,
): OperationalStatus {
  if (!e) return "unknown";
  if (e.status === "temporarily_closed" && e.expectedUntil && now.getTime() > endOfValidity(e.expectedUntil)) return "unknown";
  return e.status;
}

/** True when the trail is currently closed: permanently, or temporarily and not past its expected end. */
export function isClosed(e: { status: OperationalStatus; expectedUntil: string | null } | null, now: Date): boolean {
  const status = effectiveCondition(e, now);
  return status === "permanently_closed" || status === "temporarily_closed";
}
