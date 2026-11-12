import { describe, expect, it } from "vitest";
import { CHALLENGES, challengeProgress, rideChallengeEvents, type ChallengeEvent } from "./challenges";

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
  it("has no challenge about speed or streaks, and distance only against your own best", () => {
    expect(JSON.stringify(CHALLENGES)).not.toMatch(/speed|\bkm\b|streak|leaderboard/i);
  });
});

describe("ride challenges", () => {
  const rides = (n: number) => Array.from({ length: n }, (_, i) => ev({ kind: "rides", at: new Date(`2026-11-0${i + 2}T00:00:00Z`) }));
  it("completes 'Ride 4 times this month' with four rides in the month", () => {
    expect(challengeProgress(def("rides-in-region"), { joinedAt, events: rides(4), now, rideOptIn: true })).toMatchObject({ state: "complete", current: 4, target: 4 });
    expect(challengeProgress(def("rides-in-region"), { joinedAt, events: rides(3), now, rideOptIn: true })).toMatchObject({ state: "in_progress", current: 3 });
  });
  it("shows not_joined when opted in but not enrolled", () => {
    expect(challengeProgress(def("rides-in-region"), { joinedAt: null, events: rides(4), now, rideOptIn: true })).toMatchObject({ state: "not_joined", current: 0 });
  });
  it("stays locked, with a hint and no progress, when ride comparison is off", () => {
    const p = challengeProgress(def("longest-ride-region"), { joinedAt, events: rides(4), now, rideOptIn: false });
    expect(p).toMatchObject({ state: "locked", current: 0, fraction: 0, hint: "Turn on ride comparison to count rides" });
    expect(challengeProgress(def("rides-in-region"), { joinedAt, events: [], now }).state).toBe("locked");
  });
  it("counts a longest_ride only when it beats the previous best", () => {
    const day = (d: number) => new Date(`2026-10-${String(d).padStart(2, "0")}T00:00:00Z`);
    const r = (ref: string, d: number, km: number) => ({ rideRef: ref, day: day(d), distanceKm: km });
    const events = rideChallengeEvents([r("a", 5, 40), r("b", 20, 30), r("c", 28, 55), r("d", 29, 55), r("e", 30, 20)]);
    expect(events.filter((e) => e.kind === "rides")).toHaveLength(5);
    expect(events.filter((e) => e.kind === "longest_ride").map((e) => e.at)).toEqual([day(28)]);
  });
  it("counts the first ride as no record (nothing to beat yet)", () => {
    expect(rideChallengeEvents([{ rideRef: "a", day: new Date("2026-11-02T00:00:00Z"), distanceKm: 10 }]).filter((e) => e.kind === "longest_ride")).toEqual([]);
  });
  it("counts a ride on the day of joining, not the day before", () => {
    const joined = new Date("2026-11-05T10:00:00Z");
    const same = ev({ kind: "rides", at: new Date("2026-11-05T00:00:00Z") });
    const before = ev({ kind: "rides", at: new Date("2026-11-04T00:00:00Z") });
    expect(challengeProgress(def("rides-in-region"), { joinedAt: joined, events: [same, before], now, rideOptIn: true }).current).toBe(1);
  });
  it("never names speed or a streak in an id", () => {
    for (const c of CHALLENGES) expect(c.id).not.toMatch(/speed|streak/);
  });
});
