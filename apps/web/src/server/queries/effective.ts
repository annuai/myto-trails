import { effectiveCondition, effectiveVerificationLevel } from "@moto-trails/domain";
import type { TrailSummaryDto } from "./types";

/**
 * Recomputes the time-dependent fields from the stored values. Cached DTOs are computed at cache time;
 * run this on every request so expiries and overdue closures are never served stale.
 */
export function applyNow<T extends TrailSummaryDto>(dto: T, now: Date): T {
  return {
    ...dto,
    condition: effectiveCondition({ status: dto.rawCondition, expectedUntil: dto.conditionExpectedUntil }, now),
    verification: effectiveVerificationLevel({ level: dto.rawVerificationLevel, validUntil: dto.validUntil }, now),
  };
}
