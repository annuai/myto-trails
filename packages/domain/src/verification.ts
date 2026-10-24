import type { VerificationLevel } from "./enums";
import { DAY_MS, endOfValidity } from "./time";

const EXPIRING: readonly VerificationLevel[] = ["officially_verified", "moderator_verified"];
const GRACE_DAYS = 30;

/**
 * Verified levels expire at `validUntil`. For 30 days afterwards the level stays but needs a re-check;
 * after that the trail displays as unverified (still needing a re-check).
 */
export function effectiveVerificationLevel(
  a: { level: VerificationLevel; validUntil: string | null },
  now: Date,
): { level: VerificationLevel; needsRecheck: boolean } {
  if (!a.validUntil || !EXPIRING.includes(a.level)) return { level: a.level, needsRecheck: false };
  const end = endOfValidity(a.validUntil);
  if (now.getTime() <= end) return { level: a.level, needsRecheck: false };
  if (now.getTime() > end + GRACE_DAYS * DAY_MS) return { level: "unverified", needsRecheck: true };
  return { level: a.level, needsRecheck: true };
}
