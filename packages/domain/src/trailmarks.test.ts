import { describe, expect, it } from "vitest";
import { decideAward, TRAILMARK_ACTIONS, TRAILMARK_RULES, trailmarkTotal, TRAILMARKS_NOTE, type AwardRequest } from "./trailmarks";

const req = (o: Partial<AwardRequest> = {}): AwardRequest => ({ action: "new_trail", state: "approved", userId: "rider", confirmedBy: ["mod"], awardedToday: 0, alreadyAwarded: false, ...o });

describe("points", () => {
  it("match the published table", () => {
    expect(TRAILMARK_ACTIONS.map((a) => TRAILMARK_RULES[a].points)).toEqual([100, 20, 25, 25, 20, 15]);
  });
  it("say plainly that they are not money", () => {
    expect(TRAILMARKS_NOTE).toMatch(/not money or crypto/);
  });
});

describe("decideAward", () => {
  it("awards an approved contribution its points", () => {
    expect(decideAward(req())).toEqual({ award: true, points: 100 });
    expect(decideAward(req({ action: "correction" }))).toEqual({ award: true, points: 15 });
  });
  it("awards nothing unless approved", () => {
    for (const state of ["draft", "pending", "rejected", "disputed", "outdated"] as const) expect(decideAward(req({ state }))).toEqual({ award: false, reason: "not_approved" });
  });
  it("refuses a rider confirming their own work", () => {
    expect(decideAward(req({ confirmedBy: ["rider"] }))).toEqual({ award: false, reason: "self_confirmed" });
    expect(decideAward(req({ confirmedBy: [] }))).toEqual({ award: false, reason: "not_enough_confirmations" });
  });
  it("needs two other riders for a road-condition report, and ignores the reporter's own vote", () => {
    const c = { action: "condition_confirmed" as const };
    expect(decideAward(req({ ...c, confirmedBy: ["a", "rider"] }))).toEqual({ award: false, reason: "not_enough_confirmations" });
    expect(decideAward(req({ ...c, confirmedBy: ["a", "a"] }))).toEqual({ award: false, reason: "not_enough_confirmations" });
    expect(decideAward(req({ ...c, confirmedBy: ["a", "b"] }))).toEqual({ award: true, points: 25 });
  });
  it("enforces the daily cap and one award per contribution", () => {
    expect(decideAward(req({ awardedToday: TRAILMARK_RULES.new_trail.dailyCap }))).toEqual({ award: false, reason: "daily_cap" });
    expect(decideAward(req({ awardedToday: TRAILMARK_RULES.new_trail.dailyCap - 1 })).award).toBe(true);
    expect(decideAward(req({ alreadyAwarded: true }))).toEqual({ award: false, reason: "already_awarded" });
  });
  it("reads configuration rather than fixed numbers", () => {
    expect(decideAward(req(), { ...TRAILMARK_RULES, new_trail: { ...TRAILMARK_RULES.new_trail, points: 7 } })).toEqual({ award: true, points: 7 });
  });
});

it("totals a ledger", () => {
  expect(trailmarkTotal([{ points: 100 }, { points: 25 }])).toBe(125);
  expect(trailmarkTotal([])).toBe(0);
});
