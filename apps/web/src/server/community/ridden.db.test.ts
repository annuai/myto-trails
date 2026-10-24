// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { completeWelcome } from "./members";
import { getRiddenSummary, markRidden, unmarkRidden } from "./ridden";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-10-24T12:00:00Z");
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const member = async (o: { name?: string; pub?: boolean } = {}) => {
  const id = await makeUser(db.sql, { name: o.name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: o.name ?? "Some Rider", profilePublic: o.pub ?? false, isWoman: false });
  return id;
};

describe("markRidden", () => {
  it("records a ride with month, bike and note, and updates it when repeated", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await member();
    expect(await markRidden(db.sql, { userId: u, slug: t.slug, month: "2026-09", bike: " Himalayan ", note: "Slippery after rain", now })).toEqual({ ok: true });
    expect((await getRiddenSummary(db.sql, t.slug, u)).mine).toEqual({ riddenMonth: "2026-09-01", bike: "Himalayan", note: "Slippery after rain" });
    await markRidden(db.sql, { userId: u, slug: t.slug, month: null, bike: "Scram", now });
    const s = await getRiddenSummary(db.sql, t.slug, u);
    expect(s.count).toBe(1);
    expect(s.mine).toEqual({ riddenMonth: null, bike: "Scram", note: null });
  });

  it("requires the member declaration and a published trail", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const nonMember = await makeUser(db.sql);
    expect(await markRidden(db.sql, { userId: nonMember, slug: t.slug, now })).toEqual({ ok: false, reason: "not_member" });
    const u = await member();
    expect(await markRidden(db.sql, { userId: u, slug: draft.slug, now })).toEqual({ ok: false, reason: "not_found" });
    expect(await markRidden(db.sql, { userId: u, slug: "no-such-trail", now })).toEqual({ ok: false, reason: "not_found" });
    expect(await markRidden(db.sql, { userId: u, slug: "BAD SLUG", now })).toEqual({ ok: false, reason: "not_found" });
  });

  it.each([["2026-13"], ["26-09"], ["2026-9"], ["2027-01"], ["junk"]])("rejects the month %j", async (month) => {
    const t = await insertTrailFixture(db.sql, {});
    expect(await markRidden(db.sql, { userId: await member(), slug: t.slug, month, now })).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects over-long text and limits to 30 an hour", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await member();
    expect(await markRidden(db.sql, { userId: u, slug: t.slug, bike: "x".repeat(61), now })).toEqual({ ok: false, reason: "invalid" });
    expect(await markRidden(db.sql, { userId: u, slug: t.slug, note: "x".repeat(201), now })).toEqual({ ok: false, reason: "invalid" });
    for (let i = 0; i < 30; i++) await markRidden(db.sql, { userId: u, slug: t.slug, now });
    expect(await markRidden(db.sql, { userId: u, slug: t.slug, now })).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("getRiddenSummary and unmarkRidden", () => {
  it("counts everyone, lists only public riders, hides private ones and never shows account ids", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const pub = await member({ name: "Public Priya", pub: true });
    const priv = await member({ name: "Private Pavan" });
    await markRidden(db.sql, { userId: pub, slug: t.slug, month: "2026-08", bike: "Himalayan", now });
    await markRidden(db.sql, { userId: priv, slug: t.slug, now });
    const s = await getRiddenSummary(db.sql, t.slug, null);
    expect(s).toMatchObject({ count: 2, unlisted: 1, mine: null, lastRidden: expect.any(String) });
    expect(s.riders).toHaveLength(1);
    expect(s.riders[0]).toMatchObject({ displayName: "Public Priya", bike: "Himalayan" });
    expect(JSON.stringify(s)).not.toContain(pub);
    expect(JSON.stringify(s)).not.toContain(priv);
  });

  it("removes the rider's record and updates the count; unknown slugs are harmless", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await member();
    await markRidden(db.sql, { userId: u, slug: t.slug, now });
    expect(await unmarkRidden(db.sql, { userId: u, slug: t.slug })).toEqual({ ok: true });
    expect((await getRiddenSummary(db.sql, t.slug, u)).count).toBe(0);
    expect(await unmarkRidden(db.sql, { userId: u, slug: "nope" })).toEqual({ ok: true });
    expect(await getRiddenSummary(db.sql, "BAD SLUG", null)).toMatchObject({ count: 0, riders: [] });
  });
});
