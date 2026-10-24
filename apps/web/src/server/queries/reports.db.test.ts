import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { createReport } from "./reports";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const place = { state: { slug: "kerala", name: "Kerala" }, district: null };
let n = 0;
const details = "The gate at the start was locked when I arrived on Saturday.";

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const user = async () => {
  const [u] = await db.sql`insert into app_user (email, display_name) values (${`reporter${++n}@example.test`}, 'Reporter') returning id`;
  return u!.id as string;
};
const trail = (o = {}) => insertTrailFixture(db.sql, { ...place, ...o });

describe("createReport", () => {
  it("stores a report for a published trail and returns a short reference", async () => {
    const u = await user();
    const t = await trail();
    const r = await createReport(db.sql, { userId: u, slug: t.slug, type: "closure", details });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ref).toMatch(/^[0-9A-F]{8}$/);
    const [row] = await db.sql`select type, priority, status, details, reporter_id from trail_report where trail_id = ${t.trailId}`;
    expect(row).toMatchObject({ type: "closure", priority: "normal", status: "open", details, reporter_id: u });
  });

  it("marks environmental and unsafe-information reports as high priority", async () => {
    const u = await user();
    const t = await trail();
    await createReport(db.sql, { userId: u, slug: t.slug, type: "environmental", details });
    await createReport(db.sql, { userId: u, slug: t.slug, type: "unsafe_info", details });
    const rows = await db.sql`select type, priority from trail_report where trail_id = ${t.trailId} order by type`;
    expect(rows.map((r) => [r.type, r.priority])).toEqual([["environmental", "high"], ["unsafe_info", "high"]]);
  });

  it("rejects invalid input without writing anything", async () => {
    const u = await user();
    const t = await trail();
    expect(await createReport(db.sql, { userId: u, slug: t.slug, type: "closure", details: "short" })).toMatchObject({ ok: false, reason: "invalid" });
    expect(await createReport(db.sql, { userId: u, slug: t.slug, type: "bogus", details })).toMatchObject({ ok: false, reason: "invalid" });
    const [c] = await db.sql`select count(*)::int as n from trail_report where trail_id = ${t.trailId}`;
    expect(c!.n).toBe(0);
  });

  it("refuses unknown, unpublished and malformed trails", async () => {
    const u = await user();
    const draft = await trail({ lifecycle: "draft" });
    for (const slug of [draft.slug, "no-such-trail", "BAD SLUG", "x'; drop table trail;--"]) {
      expect(await createReport(db.sql, { userId: u, slug, type: "closure", details })).toEqual({ ok: false, reason: "not_found" });
    }
  });

  it("treats an identical resubmission within an hour as the same report", async () => {
    const u = await user();
    const t = await trail();
    const a = await createReport(db.sql, { userId: u, slug: t.slug, type: "closure", details });
    const b = await createReport(db.sql, { userId: u, slug: t.slug, type: "closure", details });
    expect(a.ok && b.ok && a.ref === b.ref).toBe(true);
    const [c] = await db.sql`select count(*)::int as n from trail_report where trail_id = ${t.trailId}`;
    expect(c!.n).toBe(1);
  });

  it("limits each user to 10 new reports per day", async () => {
    const u = await user();
    const t = await trail();
    const results: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      const r = await createReport(db.sql, { userId: u, slug: t.slug, type: "other", details: `${details} Variant number ${i}.` });
      results.push(r.ok);
    }
    expect(results.every(Boolean)).toBe(true);
    const last = await createReport(db.sql, { userId: u, slug: t.slug, type: "other", details: `${details} One more different report.` });
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("does not let one user's limit affect another", async () => {
    const a = await user();
    const b = await user();
    const t = await trail();
    for (let i = 0; i < 10; i++) await createReport(db.sql, { userId: a, slug: t.slug, type: "other", details: `${details} Spam ${i}.` });
    expect((await createReport(db.sql, { userId: b, slug: t.slug, type: "other", details })).ok).toBe(true);
  });
});
