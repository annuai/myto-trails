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
