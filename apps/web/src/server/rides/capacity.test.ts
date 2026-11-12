// @vitest-environment node
import { describe, expect, it } from "vitest";
import { capacityConfig, DEFAULT_CAPACITY, limitFor, planFor, upgradeOptions, type EntitlementRow } from "./capacity";

const now = new Date("2026-11-12T06:00:00Z");
const day = 86_400_000;
const row = (o: Partial<EntitlementRow>): EntitlementRow => ({ kind: "organiser", rideId: null, status: "active", startsAt: new Date(now.getTime() - day), endsAt: null, ...o });
const FIVE = capacityConfig({ GROUP_RIDE_FREE_LIMIT: "5" });

describe("group ride plan", () => {
  it("is free with no entitlements", () => expect(planFor("r1", [], now)).toBe("free"));
  it("a pass counts for its own ride only", () => {
    const pass = row({ kind: "large_ride_pass", rideId: "r1" });
    expect(planFor("r1", [pass], now)).toBe("large_ride_pass");
    expect(planFor("r2", [pass], now)).toBe("free");
  });
  it("organiser covers every ride while it lasts", () => {
    expect(planFor("r9", [row({ endsAt: new Date(now.getTime() + day) })], now)).toBe("organiser");
    expect(planFor("r9", [row({ endsAt: new Date(now.getTime() - 1) })], now)).toBe("free");
    expect(planFor("r9", [row({ startsAt: new Date(now.getTime() + day) })], now)).toBe("free");
  });
  it.each(["pending", "failed", "cancelled", "refunded"])("a %s entitlement gives nothing", (status) => {
    expect(planFor("r1", [row({ status }), row({ kind: "large_ride_pass", rideId: "r1", status })], now)).toBe("free");
  });
  it("organiser beats a pass", () => {
    expect(planFor("r1", [row({ kind: "large_ride_pass", rideId: "r1" }), row({})], now)).toBe("organiser");
  });
});

describe("group ride limits", () => {
  it("defaults keep the old free size until billing exists", () => expect(limitFor("free")).toBe(100));
  it("reads 5 / 20 / 50 from configuration", () => {
    expect([limitFor("free", FIVE), limitFor("large_ride_pass", FIVE), limitFor("organiser", FIVE)]).toEqual([5, 20, 50]);
  });
  it("ignores bad configuration", () => expect(capacityConfig({ GROUP_RIDE_FREE_LIMIT: "-3", GROUP_RIDE_PASS_LIMIT: "x" }).limits).toEqual(DEFAULT_CAPACITY.limits));
  it("never shrinks below the free size", () => expect(limitFor("large_ride_pass", capacityConfig({ GROUP_RIDE_FREE_LIMIT: "30" }))).toBe(30));
});

describe("upgrade options", () => {
  it("offers both from free, only organiser from a pass, nothing from organiser", () => {
    expect(upgradeOptions("free", FIVE).map((o) => o.plan)).toEqual(["large_ride_pass", "organiser"]);
    expect(upgradeOptions("large_ride_pass", FIVE).map((o) => o.plan)).toEqual(["organiser"]);
    expect(upgradeOptions("organiser", FIVE)).toEqual([]);
  });
  it("offers nothing that would not raise the limit", () => expect(upgradeOptions("free")).toEqual([]));
});
