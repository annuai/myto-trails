import { describe, expect, it } from "vitest";
import { decideSync, forkId, isSyncId, type SyncIncoming, type SyncStored } from "./sync";

const stored = (o: Partial<SyncStored> = {}): SyncStored => ({ updatedAt: 100, originDevice: "A", deleted: false, ...o });
const incoming = (o: Partial<SyncIncoming> = {}): SyncIncoming => ({ updatedAt: 200, deviceId: "B", baseUpdatedAt: 100, deleted: false, ...o });

describe("decideSync", () => {
  it("inserts a record the server has not seen", () => expect(decideSync("ride", null, incoming())).toBe("insert"));

  it("takes an edit made from the stored version", () => expect(decideSync("ride", stored(), incoming())).toBe("overwrite"));

  it("lets one phone move its own record forward, and ignores a replay of an older edit", () => {
    expect(decideSync("todo", stored({ originDevice: "B" }), incoming({ baseUpdatedAt: null }))).toBe("overwrite");
    expect(decideSync("todo", stored({ originDevice: "B", updatedAt: 300 }), incoming())).toBe("stale");
  });

  it("keeps both copies of a ride edited on two phones from the same start", () => {
    expect(decideSync("ride", stored({ updatedAt: 150 }), incoming({ baseUpdatedAt: 100 }))).toBe("fork");
  });

  it("uses last-writer-wins for other kinds", () => {
    expect(decideSync("todo", stored({ updatedAt: 150 }), incoming({ baseUpdatedAt: 100 }))).toBe("overwrite");
    expect(decideSync("todo", stored({ updatedAt: 250 }), incoming({ baseUpdatedAt: 100 }))).toBe("stale");
  });

  it("never forks over a delete: the newer side wins", () => {
    expect(decideSync("ride", stored({ updatedAt: 150 }), incoming({ baseUpdatedAt: 100, deleted: true }))).toBe("overwrite");
    expect(decideSync("ride", stored({ updatedAt: 150, deleted: true }), incoming({ baseUpdatedAt: 100 }))).toBe("overwrite");
    expect(decideSync("ride", stored({ updatedAt: 250, deleted: true }), incoming({ baseUpdatedAt: 100 }))).toBe("stale");
  });
});

describe("ids", () => {
  it("accepts ride ids and refuses path-like or empty ids", () => {
    expect(isSyncId("0b9f6d5e-1c2a-4f3b-9d7e-111122223333")).toBe(true);
    for (const bad of ["", "a/b", "../x", "a b", "x".repeat(81), 5, null]) expect(isSyncId(bad)).toBe(false);
  });
  it("forks to a stable id that is itself a valid id", () => {
    expect(forkId("ride1", "dev-ice_9")).toBe(forkId("ride1", "dev-ice_9"));
    expect(isSyncId(forkId("r".repeat(80), "device-with-long-name!"))).toBe(true);
  });
});
