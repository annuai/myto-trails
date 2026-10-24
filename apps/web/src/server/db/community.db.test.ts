import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const comment = (trailId: string, userId: string, o: { body?: string; status?: string; deleted?: boolean; tag?: string } = {}) =>
  db.sql`insert into trail_comment (trail_id, user_id, body, status, deleted_at, tag)
    values (${trailId}, ${userId}, ${o.body ?? "Gate was open when I rode it."}, ${o.status ?? "visible"}, ${o.deleted ? db.sql`now()` : null}, ${o.tag ?? null}) returning id`;

describe("community tables are private", () => {
  it.each(["trail_ridden", "trail_comment", "content_report"])("anon cannot read %s", async (table) => {
    await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
  });
});

describe("app_user community columns", () => {
  it("defaults to private, undeclared, with an opaque public id", async () => {
    const u = await makeUser(db.sql);
    const [row] = await db.sql`select adult_confirmed_at, profile_public, is_woman, public_id from app_user where id = ${u}`;
    expect(row).toMatchObject({ adult_confirmed_at: null, profile_public: false, is_woman: false });
    expect(row!.public_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row!.public_id).not.toBe(u);
  });
});

describe("public_trail_rider_counts and public_trail_riders", () => {
  it("counts every rider but lists only public ones, with the opaque id and never the account id or email", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const pub = await makeUser(db.sql, { name: "Public Priya" });
    const priv = await makeUser(db.sql, { name: "Private Pavan" });
    await db.sql`update app_user set profile_public = true where id = ${pub}`;
    await db.sql`insert into trail_ridden (user_id, trail_id, ridden_month, bike) values (${pub}, ${t.trailId}, '2026-09-01', 'Himalayan'), (${priv}, ${t.trailId}, null, null)`;
    const [counts] = await asAnon(db.sql, (tx) => tx`select riders, last_ridden::text from public_trail_rider_counts where trail_slug = ${t.slug}`);
    expect(counts!.riders).toBe(2);
    const riders = await asAnon(db.sql, (tx) => tx`select * from public_trail_riders where trail_slug = ${t.slug}`);
    expect(riders).toHaveLength(1);
    expect(riders[0]).toMatchObject({ display_name: "Public Priya", bike: "Himalayan" });
    expect(Object.keys(riders[0]!)).not.toContain("user_id");
    expect(JSON.stringify(riders)).not.toContain(pub);
  });

  it("validates the month, bike and note, and keeps one record per rider per trail", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await makeUser(db.sql);
    await expect(db.sql`insert into trail_ridden (user_id, trail_id, ridden_month) values (${u}, ${t.trailId}, '2026-09-15')`).rejects.toThrow();
    await expect(db.sql`insert into trail_ridden (user_id, trail_id, bike) values (${u}, ${t.trailId}, ${"x".repeat(61)})`).rejects.toThrow();
    await db.sql`insert into trail_ridden (user_id, trail_id) values (${u}, ${t.trailId})`;
    await expect(db.sql`insert into trail_ridden (user_id, trail_id) values (${u}, ${t.trailId})`).rejects.toThrow(/duplicate|unique/i);
  });

  it("ignores suspended riders and unpublished trails", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const u = await makeUser(db.sql);
    await db.sql`insert into trail_ridden (user_id, trail_id) values (${u}, ${t.trailId}), (${u}, ${draft.trailId})`;
    await db.sql`update app_user set status = 'suspended' where id = ${u}`;
    expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trail_rider_counts where trail_slug in (${t.slug}, ${draft.slug})`)).toHaveLength(0);
  });
});

describe("public_trail_comments", () => {
  it("shows only visible, undeleted comments on published trails, with the author's handle only for public profiles", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const pub = await makeUser(db.sql, { name: "Open Omar" });
    const priv = await makeUser(db.sql, { name: "Quiet Qadir" });
    await db.sql`update app_user set profile_public = true where id = ${pub}`;
    await comment(t.trailId, pub, { body: "Visible from a public profile", tag: "tip" });
    await comment(t.trailId, priv, { body: "Visible from a private profile" });
    await comment(t.trailId, priv, { body: "Waiting for approval", status: "pending" });
    await comment(t.trailId, priv, { body: "Hidden by a moderator", status: "hidden" });
    await comment(t.trailId, priv, { body: "Deleted by the author", deleted: true });
    await comment(draft.trailId, priv, { body: "On an unpublished trail" });
    const rows = await asAnon(db.sql, (tx) => tx`select body, author_name, author_id, tag from public_trail_comments where trail_slug in (${t.slug}, ${draft.slug}) order by body`);
    expect(rows.map((r) => r.body)).toEqual(["Visible from a private profile", "Visible from a public profile"]);
    expect(rows.find((r) => r.author_name === "Open Omar")!.author_id).not.toBeNull();
    expect(rows.find((r) => r.author_name === "Quiet Qadir")!.author_id).toBeNull();
    const cols = (await db.sql`select column_name from information_schema.columns where table_name = 'public_trail_comments'`).map((c) => c.column_name);
    expect(cols).not.toContain("user_id");
  });

  it("limits tags, status and length", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await makeUser(db.sql);
    await expect(comment(t.trailId, u, { tag: "spam" })).rejects.toThrow();
    await expect(comment(t.trailId, u, { status: "approved" })).rejects.toThrow();
    await expect(comment(t.trailId, u, { body: "x" })).rejects.toThrow();
    await expect(comment(t.trailId, u, { body: "x".repeat(1501) })).rejects.toThrow();
  });
});

describe("content_report", () => {
  it("allows one report per reporter per item", async () => {
    const reporter = await makeUser(db.sql);
    const id = crypto.randomUUID();
    await db.sql`insert into content_report (subject_type, subject_id, reporter_id, reason) values ('comment', ${id}, ${reporter}, 'This is abusive towards others')`;
    await expect(db.sql`insert into content_report (subject_type, subject_id, reporter_id, reason) values ('comment', ${id}, ${reporter}, 'Reporting it again')`).rejects.toThrow(/duplicate|unique/i);
    await expect(db.sql`insert into content_report (subject_type, subject_id, reporter_id, reason) values ('comment', ${crypto.randomUUID()}, ${reporter}, 'no')`).rejects.toThrow();
  });
});
