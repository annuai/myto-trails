import { describe, expect, it } from "vitest";
import { LEADERBOARD_METRICS, parseLeaderboardMetric, rankRiders, type RankableRider } from "./leaderboard";

const counts = (n: number) => ({ verified_contributions: n, new_discoveries: n, exploration_diversity: n, helpful_contributions: n, challenge_participation: n });
const rider = (name: string, n: number, optedIn = true): RankableRider => ({ publicName: name, publicId: `id-${name}`, optedIn, counts: counts(n) });

describe("parseLeaderboardMetric", () => {
  it("accepts only the contribution metrics", () => {
    for (const m of LEADERBOARD_METRICS) expect(parseLeaderboardMetric(m)).toEqual({ ok: true, metric: m });
  });
  it("refuses speed and distance by name", () => {
    for (const m of ["top_speed", "speed", "distance", "total_km", "fastest_lap", "elevation_gain", "ride_time", "streak"]) expect(parseLeaderboardMetric(m)).toEqual({ ok: false, reason: "refused" });
  });
  it("rejects anything else as unknown", () => {
    expect(parseLeaderboardMetric("karma")).toEqual({ ok: false, reason: "unknown" });
    expect(parseLeaderboardMetric(undefined)).toEqual({ ok: false, reason: "unknown" });
  });
});

describe("rankRiders", () => {
  it("leaves out riders who did not opt in or have nothing", () => {
    expect(rankRiders([rider("a", 5), rider("b", 9, false), rider("c", 0)], "verified_contributions").map((e) => e.name)).toEqual(["a"]);
  });
  it("orders high to low, shares rank on ties and breaks them by name", () => {
    const r = rankRiders([rider("z", 3), rider("b", 5), rider("a", 5), rider("m", 1)], "new_discoveries");
    expect(r.map((e) => [e.name, e.rank])).toEqual([["a", 1], ["b", 1], ["z", 3], ["m", 4]]);
  });
  it("shows only a name, an opaque id, a rank and a value", () => {
    expect(Object.keys(rankRiders([rider("a", 2)], "helpful_contributions")[0]!).sort()).toEqual(["id", "name", "rank", "value"]);
  });
  it("is limited in size", () => {
    expect(rankRiders(Array.from({ length: 50 }, (_, i) => rider(`r${i}`, i + 1)), "verified_contributions")).toHaveLength(20);
  });
});
