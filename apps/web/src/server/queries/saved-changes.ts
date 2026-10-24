import type { AccessClass, OperationalStatus, VerificationLevel } from "@moto-trails/domain";

/** What a rider last saw about a saved trail. Compared against the current state to show "Changed". */
export type SavedSnapshot = { accessClass: AccessClass; condition: OperationalStatus; verification: VerificationLevel };

export type SavedChange = { field: "access" | "condition" | "verification"; from: string; to: string };

export function snapshotOf(t: { accessClass: AccessClass; condition: OperationalStatus; verification: { level: VerificationLevel; needsRecheck?: boolean } }): SavedSnapshot {
  return { accessClass: t.accessClass, condition: t.condition, verification: t.verification.level };
}

export function diffSnapshot(prev: SavedSnapshot, current: SavedSnapshot): SavedChange[] {
  if (!prev || typeof prev !== "object" || !prev.accessClass || !prev.condition || !prev.verification) return [];
  const changes: SavedChange[] = [];
  if (prev.accessClass !== current.accessClass) changes.push({ field: "access", from: prev.accessClass, to: current.accessClass });
  if (prev.condition !== current.condition) changes.push({ field: "condition", from: prev.condition, to: current.condition });
  if (prev.verification !== current.verification) changes.push({ field: "verification", from: prev.verification, to: current.verification });
  return changes;
}
