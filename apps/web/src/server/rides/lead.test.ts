// @vitest-environment node
import { describe, expect, it } from "vitest";
import { leaderDroppedOff, leaderQuietFor15, mayTakeLead, pickSuccessor, SILENT_OFFER_MS, SILENT_PROMOTE_MS, type Candidate } from "./lead";

const now = new Date("2026-11-04T06:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const rider = (userId: string, o: Partial<Candidate> = {}): Candidate => ({ userId, titles: [], joinedAt: ago(60 * MIN), seenAt: ago(MIN), ...o });

describe("leaderDroppedOff", () => {
  const base = { seenAt: ago(SILENT_PROMOTE_MS + MIN), battery: 4, charging: false };
  it("is true for a leader quiet for 10 minutes whose last battery was low", () => expect(leaderDroppedOff(base, now)).toBe(true));
  it("is not true for a leader quiet only a short while", () => expect(leaderDroppedOff({ ...base, seenAt: ago(5 * MIN) }, now)).toBe(false));
  it("is never true because of lost signal alone: a healthy battery, or none reported, or charging", () => {
    expect(leaderDroppedOff({ ...base, battery: 60 }, now)).toBe(false);
    expect(leaderDroppedOff({ ...base, battery: null }, now)).toBe(false);
    expect(leaderDroppedOff({ ...base, charging: true }, now)).toBe(false);
    expect(leaderDroppedOff({ ...base, seenAt: null }, now)).toBe(false);
  });
});

describe("leaderQuietFor15", () => {
  it("counts from the last position, or from joining when there never was one", () => {
    expect(leaderQuietFor15(ago(SILENT_OFFER_MS + MIN), ago(HOUR), now)).toBe(true);
    expect(leaderQuietFor15(ago(10 * MIN), ago(HOUR), now)).toBe(false);
    expect(leaderQuietFor15(null, ago(SILENT_OFFER_MS + MIN), now)).toBe(true);
  });
});
const HOUR = 60 * MIN;

describe("pickSuccessor", () => {
  const leaderId = "L";
  it("takes the leader's own choice first", () => {
    const rs = [rider("A", { titles: ["marshal"] }), rider("B")];
    expect(pickSuccessor(rs, { successorId: "B", leaderId, now })!.userId).toBe("B");
  });
  it("then a marshal, then a captain, then whoever has been in the group longest", () => {
    expect(pickSuccessor([rider("A"), rider("B", { titles: ["captain"] }), rider("C", { titles: ["marshal"] })], { successorId: null, leaderId, now })!.userId).toBe("C");
    expect(pickSuccessor([rider("A"), rider("B", { titles: ["captain"] })], { successorId: null, leaderId, now })!.userId).toBe("B");
    expect(pickSuccessor([rider("A", { joinedAt: ago(10 * MIN) }), rider("B", { joinedAt: ago(90 * MIN) })], { successorId: null, leaderId, now })!.userId).toBe("B");
  });
  it("skips a choice who has not been heard from lately, and never picks the leader or a rider who is gone", () => {
    const rs = [rider("B", { seenAt: ago(30 * MIN) }), rider("L"), rider("C", { seenAt: null }), rider("D", { joinedAt: ago(5 * MIN) })];
    expect(pickSuccessor(rs, { successorId: "B", leaderId, now })!.userId).toBe("D");
  });
  it("is nobody when nobody is there", () => expect(pickSuccessor([rider("L"), rider("B", { seenAt: null })], { successorId: null, leaderId, now })).toBeNull());
});

describe("mayTakeLead", () => {
  it("is the backup, a marshal or a captain, and no other rider", () => {
    expect(mayTakeLead({ userId: "A", titles: [] }, "A")).toBe(true);
    expect(mayTakeLead({ userId: "B", titles: ["marshal"] }, null)).toBe(true);
    expect(mayTakeLead({ userId: "C", titles: ["captain"] }, null)).toBe(true);
    expect(mayTakeLead({ userId: "D", titles: ["medic", "sweep"] }, "A")).toBe(false);
  });
});
