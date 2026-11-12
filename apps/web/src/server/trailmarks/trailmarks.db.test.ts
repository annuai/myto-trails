// @vitest-environment node
// Needs local PostGIS (see docs/runbooks/dev-setup.md); not run routinely.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedRegions } from "../db/seed-regions";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { awardTrailmarks, getMyTrailmarks, getLeaderboard, setLeaderboardOptIn } from "./trailmarks";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { db = await createTestDatabase(); await seedRegions(db.sql); });
afterAll(async () => { await db.drop(); });

const now = new Date("2026-11-12T10:00:00Z");
const award = (userId: string, refId: string, over: Partial<Parameters<typeof awardTrailmarks>[1]> = {}) =>
  awardTrailmarks(db.sql, { userId, action: "new_trail", refType: "submission", refId, state: "approved", confirmedBy: ["00000000-0000-4000-8000-000000000001"], now, ...over });
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("awardTrailmarks", () => {
  it("awards once per contribution, even when retried", async () => {
    const u = await makeUser(db.sql);
    expect(await award(u, uuid(10))).toMatchObject({ award: true, points: 100, inserted: true });
    expect(await award(u, uuid(10))).toMatchObject({ award: false, reason: "already_awarded" });
    expect((await getMyTrailmarks(db.sql, { userId: u, now })).total).toBe(100);
  });
  it("awards nothing for a rejected or disputed contribution", async () => {
    const u = await makeUser(db.sql);
    expect(await award(u, uuid(11), { state: "rejected" })).toMatchObject({ award: false });
    expect(await award(u, uuid(12), { state: "disputed" })).toMatchObject({ award: false });
  });
  it("stops at the daily cap", async () => {
    const u = await makeUser(db.sql);
    const results = [];
    for (let n = 20; n < 25; n++) results.push((await award(u, uuid(n))).award);
    expect(results).toEqual([true, true, true, false, false]);
  });
  it("refuses to update the ledger", async () => {
    await expect(db.sql`update trailmark_event set points = 1`).rejects.toThrow(/append-only/);
  });
});

describe("leaderboard", () => {
  it("lists only riders who opted in and have a public profile", async () => {
    const a = await makeUser(db.sql), b = await makeUser(db.sql);
    await award(a, uuid(30)); await award(b, uuid(31));
    await db.sql`update app_user set profile_public = true where id = ${a}`;
    expect(await setLeaderboardOptIn(db.sql, { userId: b, optIn: true })).toEqual({ ok: false, reason: "profile_not_public" });
    expect(await setLeaderboardOptIn(db.sql, { userId: a, optIn: true })).toEqual({ ok: true });
    const r = await getLeaderboard(db.sql, { metric: "new_discoveries" });
    expect(r.ok && r.entries.map((e) => e.value)).toEqual([1]);
  });
});
