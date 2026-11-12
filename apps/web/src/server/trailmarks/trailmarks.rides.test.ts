import { describe, expect, it } from "vitest";
import type { Sql } from "postgres";
import { getMyTrailmarks } from "./trailmarks";

/** A fake tagged-template `sql` that answers by the table each query names; no database. */
function fakeSql(optIn: boolean, rides: { ride_ref: string; day: Date; distance_km: string }[], seen: string[] = []): Sql {
  const f = (strings: TemplateStringsArray) => {
    const q = strings.join("?");
    seen.push(q);
    if (q.includes("from ride_summary")) return Promise.resolve(q.includes("opt_in") ? rides : []);
    if (q.includes("from rider_standing_pref")) return Promise.resolve([{ opt_in: optIn }]);
    if (q.includes("from challenge_enrolment")) return Promise.resolve([{ challenge_id: "rides-in-region", joined_at: new Date("2026-11-01T00:00:00Z") }, { challenge_id: "longest-ride-region", joined_at: new Date("2026-11-01T00:00:00Z") }]);
    return Promise.resolve([]);
  };
  return f as unknown as Sql;
}
const d = (s: string) => new Date(`${s}T00:00:00Z`);
const now = new Date("2026-11-12T10:00:00Z");

describe("getMyTrailmarks ride challenges", () => {
  it("counts rides and a beaten best for an opted-in rider", async () => {
    const rides = [["a", "2026-10-10", "30"], ["b", "2026-11-02", "20"], ["c", "2026-11-03", "50"], ["d", "2026-11-04", "10"], ["e", "2026-11-05", "12"]].map(([ride_ref, day, distance_km]) => ({ ride_ref, day: d(day), distance_km }));
    const r = await getMyTrailmarks(fakeSql(true, rides), { userId: "u", now });
    expect(r.challenges.find((c) => c.def.id === "rides-in-region")).toMatchObject({ state: "complete", current: 4 });
    expect(r.challenges.find((c) => c.def.id === "longest-ride-region")).toMatchObject({ state: "complete", current: 1 });
  });
  it("locks both challenges, with the hint, when not opted in", async () => {
    const r = await getMyTrailmarks(fakeSql(false, []), { userId: "u", now });
    for (const id of ["rides-in-region", "longest-ride-region"]) expect(r.challenges.find((c) => c.def.id === id)).toMatchObject({ state: "locked", current: 0, hint: "Turn on ride comparison to count rides" });
  });
});
