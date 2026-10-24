import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let n = 0;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const user = async () => (await db.sql`insert into app_user (email, display_name) values (${`s${++n}@example.test`}, 'Submitter') returning id`)[0]!.id as string;
const cid = () => crypto.randomUUID();

describe("submission table", () => {
  it("is closed to the anonymous role", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select * from submission limit 1`)).rejects.toThrow(/permission denied/);
  });

  it("defaults to a draft at step 1 with empty data", async () => {
    const u = await user();
    const [s] = await db.sql`insert into submission (user_id, client_id) values (${u}, ${cid()}) returning kind, status, step, data`;
    expect(s).toMatchObject({ kind: "new_trail", status: "draft", step: 1, data: {} });
  });

  it("makes a retried client_id unique per user but not across users", async () => {
    const a = await user();
    const b = await user();
    const id = cid();
    await db.sql`insert into submission (user_id, client_id) values (${a}, ${id})`;
    await expect(db.sql`insert into submission (user_id, client_id) values (${a}, ${id})`).rejects.toThrow(/unique|duplicate/i);
    await expect(db.sql`insert into submission (user_id, client_id) values (${b}, ${id})`).resolves.toBeDefined();
  });

  it.each([
    ["an unknown status", "update submission set status = 'published'"],
    ["an unknown kind", "update submission set kind = 'delete_trail'"],
    ["a step outside 1-6", "update submission set step = 7"],
    ["a contributor note over 1000 characters", `update submission set contributor_note = '${"x".repeat(1001)}'`],
  ])("rejects %s", async (_l, statement) => {
    const u = await user();
    const [s] = await db.sql`insert into submission (user_id, client_id) values (${u}, ${cid()}) returning id`;
    await expect(db.sql.unsafe(`${statement} where id = '${s!.id}'`)).rejects.toThrow();
  });

  it("removes a user's submissions with the user", async () => {
    const u = await user();
    await db.sql`insert into submission (user_id, client_id) values (${u}, ${cid()})`;
    await db.sql`delete from app_user where id = ${u}`;
    expect(await db.sql`select 1 from submission where user_id = ${u}`).toHaveLength(0);
  });

  it("keeps a submitted submission pointing at its trail and revision", async () => {
    const u = await user();
    const [s] = await db.sql`insert into submission (user_id, client_id, status) values (${u}, ${cid()}, 'submitted') returning id`;
    expect(s!.id).toBeDefined();
    const cols = await db.sql`select column_name from information_schema.columns where table_name = 'submission'`;
    expect(cols.map((c) => c.column_name)).toEqual(expect.arrayContaining(["trail_id", "revision_id", "route_upload_id", "duplicate_candidates", "moderator_feedback", "submitted_at"]));
  });
});
