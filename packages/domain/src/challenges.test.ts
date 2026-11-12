import { describe, expect, it } from "vitest";
import { CHALLENGES, challengeProgress, type ChallengeEvent } from "./challenges";

const def = (id: string) => CHALLENGES.find((c) => c.id === id)!;
const now = new Date("2026-11-12T10:00:00Z");
const joinedAt = new Date("2026-11-01T00:00:00Z");
const ev = (o: Partial<ChallengeEvent> = {}): ChallengeEvent => ({ kind: "new_trails", at: new Date("2026-11-05T00:00:00Z"), districtId: "d1", ...o });

describe("challengeProgress", () => {
  it("counts nothing until the rider joins", () => {
    expect(challengeProgress(def("discover-3-district"), { joinedAt: null, events: [ev(), ev()], districtId: "d1", now })).toMatchObject({ state: "not_joined", current: 0, joined: false });
  });
  it("counts new trails in the rider's own district this month, after joining", () => {
    const events = [ev(), ev({ districtId: "d2" }), ev({ at: new Date("2026-10-20T00:00:00Z") }), ev({ at: new Date("2026-10-31T23:00:00Z") }), ev({ kind: "verifications" })];
    expect(challengeProgress(def("discover-3-district"), { joinedAt: new Date("2026-10-01T00:00:00Z"), events, districtId: "d1", now })).toMatchObject({ state: "in_progress", current: 1, target: 3 });
  });
  it("ignores events from before joining", () => {
    expect(challengeProgress(def("discover-3-district"), { joinedAt: new Date("2026-11-10T00:00:00Z"), events: [ev()], districtId: "d1", now }).current).toBe(0);
  });
  it("completes at the target and caps there", () => {
    const p = challengeProgress(def("discover-3-district"), { joinedAt, events: [ev(), ev(), ev(), ev()], districtId: "d1", now });
    expect(p).toMatchObject({ state: "complete", current: 3, fraction: 1 });
  });
  it("does not need a district for a challenge that counts anywhere", () => {
    expect(challengeProgress(def("verify-10"), { joinedAt, events: [ev({ kind: "verifications", districtId: null })], now }).current).toBe(1);
  });
  it("keeps challenges that cannot be computed yet locked, even when joined", () => {
    expect(challengeProgress(def("viewpoints-5"), { joinedAt, events: [ev({ kind: "viewpoints" })], now }).state).toBe("locked");
  });
  it("has no challenge about speed, distance or streaks", () => {
    expect(JSON.stringify(CHALLENGES)).not.toMatch(/speed|\bkm\b|streak/i);
  });
});
