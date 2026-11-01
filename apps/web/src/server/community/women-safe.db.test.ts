// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import type { Gender } from "./gender";
import { completeWelcome } from "./members";
import { getWomenSafe, markWomenSafe, unmarkWomenSafe } from "./women-safe";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-11-01T12:00:00Z");
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const rider = async (gender: Gender | null) => {
  const id = await makeUser(db.sql, {});
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: "Some Rider", profilePublic: false, gender });
  return id;
};
const view = (slug: string, viewerId: string | null) => getWomenSafe(db.sql, { slug, viewerId, now });

describe("markWomenSafe", () => {
  it("lets a woman rider mark once and remove her mark", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await rider("female");
    expect(await markWomenSafe(db.sql, { userId: u, slug: t.slug, now })).toEqual({ ok: true });
    expect(await markWomenSafe(db.sql, { userId: u, slug: t.slug, now })).toEqual({ ok: true });
    expect(await view(t.slug, u)).toEqual({ count: 1, confirmed: false, mine: true, canMark: true });
    expect(await unmarkWomenSafe(db.sql, { userId: u, slug: t.slug })).toEqual({ ok: true });
    expect(await view(t.slug, u)).toEqual({ count: 0, confirmed: false, mine: false, canMark: true });
  });

  it("refuses everyone who is not a declared woman rider", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const nonMember = await makeUser(db.sql);
    expect(await markWomenSafe(db.sql, { userId: nonMember, slug: t.slug, now })).toEqual({ ok: false, reason: "not_member" });
    for (const g of ["male", "other", null] as const) {
      expect(await markWomenSafe(db.sql, { userId: await rider(g), slug: t.slug, now })).toEqual({ ok: false, reason: "not_female" });
    }
    expect((await view(t.slug, null)).count).toBe(0);
  });

  it("needs a published trail", async () => {
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const u = await rider("female");
    expect(await markWomenSafe(db.sql, { userId: u, slug: draft.slug, now })).toEqual({ ok: false, reason: "not_found" });
    expect(await markWomenSafe(db.sql, { userId: u, slug: "no-such-trail", now })).toEqual({ ok: false, reason: "not_found" });
    expect(await markWomenSafe(db.sql, { userId: u, slug: "BAD SLUG", now })).toEqual({ ok: false, reason: "not_found" });
  });

  it("limits to 30 marks a day", async () => {
    const u = await rider("female");
    const t = await insertTrailFixture(db.sql, {});
    for (let i = 0; i < 30; i++) await markWomenSafe(db.sql, { userId: u, slug: t.slug, now });
    expect(await markWomenSafe(db.sql, { userId: u, slug: t.slug, now })).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("getWomenSafe", () => {
  it("is confirmed from three distinct riders, and shows an anonymous viewer no personal state", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const riders = [await rider("female"), await rider("female"), await rider("female")];
    for (const [n, u] of riders.entries()) {
      await markWomenSafe(db.sql, { userId: u, slug: t.slug, now });
      expect((await view(t.slug, null)).confirmed).toBe(n === 2);
    }
    expect(await view(t.slug, null)).toEqual({ count: 3, confirmed: true, mine: false, canMark: false });
    expect(await view(t.slug, riders[0]!)).toMatchObject({ mine: true, canMark: true });
    expect(await view(t.slug, await rider("male"))).toMatchObject({ count: 3, mine: false, canMark: false });
  });

  it("counts only marks from the last 24 months", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const old = await rider("female");
    const fresh = await rider("female");
    await markWomenSafe(db.sql, { userId: old, slug: t.slug, now: new Date("2024-10-31T12:00:00Z") });
    await markWomenSafe(db.sql, { userId: fresh, slug: t.slug, now: new Date("2024-11-02T12:00:00Z") });
    expect(await view(t.slug, old)).toMatchObject({ count: 1, mine: false });
    // marking again renews an expired mark
    await markWomenSafe(db.sql, { userId: old, slug: t.slug, now });
    expect(await view(t.slug, old)).toMatchObject({ count: 2, mine: true });
  });

  it("is private to the database owner: the public roles cannot read marks", async () => {
    const t = await insertTrailFixture(db.sql, {});
    await markWomenSafe(db.sql, { userId: await rider("female"), slug: t.slug, now });
    await expect(db.sql.begin(async (tx) => {
      await tx`set local role anon`;
      await tx`select * from trail_women_safe`;
    })).rejects.toThrow();
  });
});
