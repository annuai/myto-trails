import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENTS, byCategory, evaluate, evaluateAll, METRICS, type AchievementDef } from "./achievements";

const get = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!;

describe("the seed badges", () => {
  it("are the eight asked for, with unique ids and a known category", () => {
    expect(ACHIEVEMENTS.map((a) => a.title).sort()).toEqual(["Community Rider", "Explorer", "Pathfinder", "Pioneer", "Scenic Seeker", "Trailkeeper", "Weekend Wanderer", "Western Ghats Explorer"]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(ACHIEVEMENT_CATEGORIES).toContain(a.category);
  });
  it("only use metrics that exist, and never speed or distance", () => {
    for (const a of ACHIEVEMENTS) {
      if (a.criteria.type === "threshold") expect(Object.keys(METRICS)).toContain(a.criteria.metric);
      expect(JSON.stringify(a)).not.toMatch(/speed|\bkm\b|streak/i);
    }
  });
  it("keeps the three that cannot be computed honestly locked, with a hint", () => {
    for (const id of ["scenic-seeker", "pioneer", "western-ghats-explorer"]) {
      const s = evaluate(get(id), { trailsRiddenDistinct: 999, approvedTrails: 999, helpfulContributions: 999 });
      expect(s.state).toBe("needs_data");
      expect(s.hint).toMatch(/Not counted yet/);
    }
  });
});

describe("evaluate", () => {
  it("is locked at zero, in progress part way, earned at the threshold", () => {
    const explorer = get("explorer");
    expect(evaluate(explorer, { trailsRiddenDistinct: 0 }).state).toBe("locked");
    expect(evaluate(explorer, { trailsRiddenDistinct: 4 })).toMatchObject({ state: "in_progress", current: 4, target: 10, fraction: 0.4 });
    expect(evaluate(explorer, { trailsRiddenDistinct: 10 }).state).toBe("earned");
    expect(evaluate(explorer, { trailsRiddenDistinct: 40 })).toMatchObject({ state: "earned", current: 10, fraction: 1 });
  });
  it("treats a missing metric as unknown, not zero", () => {
    expect(evaluate(get("explorer"), {})).toMatchObject({ state: "needs_data" });
    expect(evaluate(get("weekend-wanderer"), {}).hint).toBe("Not counted yet.");
  });
  it("evaluates a new badge added as data alone", () => {
    const extra: AchievementDef = { id: "x", category: "personal", title: "X", hint: "h", criteria: { type: "threshold", metric: "trailmarksTotal", atLeast: 500 } };
    expect(evaluateAll({ trailmarksTotal: 500 }, [extra])[0]!.state).toBe("earned");
  });
  it("groups by category in a fixed order and drops empty ones", () => {
    const groups = byCategory(evaluateAll({}));
    expect(groups.map((g) => g.category)).toEqual(["exploration", "community", "contribution"]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(ACHIEVEMENTS.length);
  });
});
