import { describe, expect, it } from "vitest";
import { diffSnapshot, snapshotOf, type SavedSnapshot } from "./saved-changes";

const base: SavedSnapshot = { accessClass: "public", condition: "open", verification: "moderator_verified" };

describe("snapshotOf", () => {
  it("captures the effective access, condition and verification", () => {
    expect(snapshotOf({ accessClass: "restricted", condition: "unknown", verification: { level: "unverified", needsRecheck: true } })).toEqual({
      accessClass: "restricted", condition: "unknown", verification: "unverified",
    });
  });
});

describe("diffSnapshot", () => {
  it("is empty when nothing changed", () => {
    expect(diffSnapshot(base, base)).toEqual([]);
  });
  it("reports each changed field with before and after", () => {
    expect(diffSnapshot(base, { accessClass: "permission_required", condition: "temporarily_closed", verification: "moderator_verified" })).toEqual([
      { field: "access", from: "public", to: "permission_required" },
      { field: "condition", from: "open", to: "temporarily_closed" },
    ]);
    expect(diffSnapshot(base, { ...base, verification: "unverified" })).toEqual([{ field: "verification", from: "moderator_verified", to: "unverified" }]);
  });
  it("treats a missing or malformed stored snapshot as no known changes", () => {
    expect(diffSnapshot({} as never, base)).toEqual([]);
    expect(diffSnapshot(null as never, base)).toEqual([]);
    expect(diffSnapshot({ accessClass: "public" } as never, base)).toEqual([]);
  });
});
