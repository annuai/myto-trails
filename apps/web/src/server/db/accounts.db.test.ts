import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

let n = 0;
const newUser = async (o: { email?: string; name?: string } = {}) => {
  const email = o.email ?? `rider${++n}@example.test`;
  const [u] = await db.sql`insert into app_user (email, display_name) values (${email}, ${o.name ?? "Test rider"}) returning id`;
  return u!.id as string;
};

describe("user tables are closed to the anonymous role", () => {
  it.each(["app_user", "user_role", "login_token", "auth_session", "rate_limit", "collection", "collection_item", "trail_report"])(
    "anon cannot read %s",
    async (table) => {
      await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
    },
  );
  it("anon cannot call the rate-limit function", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select rate_limit_hit('k', 1, 60)`)).rejects.toThrow(/permission denied/);
  });
});

describe("app_user", () => {
  it("stores a lower-case email and rejects upper case, malformed and duplicate addresses", async () => {
    await newUser({ email: "a@example.test" });
    await expect(newUser({ email: "A@Example.test" })).rejects.toThrow();
    await expect(newUser({ email: "not-an-email" })).rejects.toThrow();
    await expect(newUser({ email: "a@example.test" })).rejects.toThrow();
    await expect(newUser({ email: `${"x".repeat(250)}@e.test` })).rejects.toThrow();
  });
  it("limits the display name to 2-40 characters", async () => {
    await expect(newUser({ name: "x" })).rejects.toThrow();
    await expect(newUser({ name: "x".repeat(41) })).rejects.toThrow();
    await expect(newUser({ name: "Ok" })).resolves.toBeDefined();
  });
  it("defaults to an active status and rejects unknown statuses", async () => {
    const id = await newUser();
    const [u] = await db.sql`select status from app_user where id = ${id}`;
    expect(u!.status).toBe("active");
    await expect(db.sql`update app_user set status = 'banned' where id = ${id}`).rejects.toThrow();
  });
});

describe("sessions and tokens", () => {
  it("deletes a user's sessions with the user and keeps token hashes unique", async () => {
    const id = await newUser();
    await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${id}, 'h1', now() + interval '1 day')`;
    await expect(db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${id}, 'h1', now() + interval '1 day')`).rejects.toThrow();
    await db.sql`delete from app_user where id = ${id}`;
    const [c] = await db.sql`select count(*)::int as n from auth_session where token_hash = 'h1'`;
    expect(c!.n).toBe(0);
  });
  it("keeps login token hashes unique", async () => {
    await db.sql`insert into login_token (email, token_hash, expires_at) values ('t@example.test', 'lt1', now() + interval '15 minutes')`;
    await expect(db.sql`insert into login_token (email, token_hash, expires_at) values ('t@example.test', 'lt1', now() + interval '15 minutes')`).rejects.toThrow();
  });
});

describe("rate_limit_hit", () => {
  it("allows up to the limit within a window and then refuses", async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) hits.push((await db.sql`select rate_limit_hit('rl-a', 3, 3600) as ok`)[0]!.ok);
    expect(hits).toEqual([true, true, true, false]);
  });
  it("counts keys independently", async () => {
    await db.sql`select rate_limit_hit('rl-b', 1, 3600)`;
    expect((await db.sql`select rate_limit_hit('rl-b', 1, 3600) as ok`)[0]!.ok).toBe(false);
    expect((await db.sql`select rate_limit_hit('rl-c', 1, 3600) as ok`)[0]!.ok).toBe(true);
  });
  it("removes windows older than a day", async () => {
    await db.sql`insert into rate_limit (key, window_start, count) values ('old', now() - interval '3 days', 5)`;
    await db.sql`select rate_limit_hit('rl-d', 1, 3600)`;
    const [c] = await db.sql`select count(*)::int as n from rate_limit where key = 'old'`;
    expect(c!.n).toBe(0);
  });
});

describe("collections", () => {
  it("allows one default collection per user and several named ones", async () => {
    const id = await newUser();
    await db.sql`insert into collection (user_id, name, is_default) values (${id}, 'Saved', true)`;
    await expect(db.sql`insert into collection (user_id, name, is_default) values (${id}, 'Other default', true)`).rejects.toThrow();
    await expect(db.sql`insert into collection (user_id, name) values (${id}, 'Weekend rides')`).resolves.toBeDefined();
  });
  it("keeps one row per trail in a collection and removes items with the trail", async () => {
    const id = await newUser();
    const t = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null });
    const [c] = await db.sql`insert into collection (user_id, name, is_default) values (${id}, 'Saved', true) returning id`;
    await db.sql`insert into collection_item (collection_id, trail_id) values (${c!.id}, ${t.trailId})`;
    await expect(db.sql`insert into collection_item (collection_id, trail_id) values (${c!.id}, ${t.trailId})`).rejects.toThrow();
    await db.sql`delete from trail where id = ${t.trailId}`;
    const [n2] = await db.sql`select count(*)::int as n from collection_item where collection_id = ${c!.id}`;
    expect(n2!.n).toBe(0);
  });
});

describe("trail_report and the public closure count", () => {
  const report = (trailId: string, reporterId: string, o: Record<string, unknown> = {}) =>
    db.sql`insert into trail_report (trail_id, reporter_id, type, details, status, created_at)
      values (${trailId}, ${reporterId}, ${(o.type as string) ?? "closure"}, ${(o.details as string) ?? "The gate was locked when I arrived on Saturday."},
        ${(o.status as string) ?? "open"}, ${(o.createdAt as string) ?? new Date().toISOString()})`;

  it("validates type, details length and status", async () => {
    const id = await newUser();
    const t = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null });
    await expect(report(t.trailId, id, { type: "complaint" })).rejects.toThrow();
    await expect(report(t.trailId, id, { details: "too short" })).rejects.toThrow();
    await expect(report(t.trailId, id, { details: "x".repeat(2001) })).rejects.toThrow();
    await expect(report(t.trailId, id, { status: "weird" })).rejects.toThrow();
    await expect(report(t.trailId, id)).resolves.toBeDefined();
  });

  it("counts recent open closure reports on the public detail view, without any reporter data", async () => {
    const id = await newUser();
    const t = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null });
    await report(t.trailId, id);
    await report(t.trailId, id);
    await report(t.trailId, id, { type: "wrong_access" });
    await report(t.trailId, id, { status: "rejected" });
    await report(t.trailId, id, { createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString() });
    const [row] = await asAnon(db.sql, (tx) => tx`select open_closure_reports from public_trail_detail where slug = ${t.slug}`);
    expect(row!.open_closure_reports).toBe(2);
    const cols = (await db.sql`select column_name from information_schema.columns where table_name = 'public_trail_detail'`).map((c) => c.column_name as string);
    expect(cols).not.toContain("reporter_id");
    expect(cols).not.toContain("details");
  });

  it("is zero when there are no reports", async () => {
    const t = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null });
    const [row] = await asAnon(db.sql, (tx) => tx`select open_closure_reports from public_trail_detail where slug = ${t.slug}`);
    expect(row!.open_closure_reports).toBe(0);
  });
});
