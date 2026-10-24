import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const record = () => db.sql`insert into moderation_record (subject_type, subject_id, moderator_id, action) values ('revision', gen_random_uuid(), gen_random_uuid(), 'approve') returning id`;
const audit = () => db.sql`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (gen_random_uuid(), 'moderator', 'approve', 'revision', gen_random_uuid()) returning id`;

describe("moderation tables", () => {
  it.each(["moderation_record", "audit_log"])("%s is closed to the anonymous role", async (table) => {
    await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
  });

  it.each([
    ["moderation_record", record, "update moderation_record set comment = 'x'", "delete from moderation_record"],
    ["audit_log", audit, "update audit_log set action = 'x'", "delete from audit_log"],
  ] as const)("%s is append-only: update, delete and truncate are refused", async (table, insert, update, del) => {
    await insert();
    await expect(db.sql.unsafe(update)).rejects.toThrow(/append-only/);
    await expect(db.sql.unsafe(del)).rejects.toThrow(/append-only/);
    await expect(db.sql.unsafe(`truncate ${table}`)).rejects.toThrow(/append-only/);
    expect((await db.sql.unsafe(`select count(*)::int as n from ${table}`))[0]!.n).toBeGreaterThan(0);
  });

  it("limits actions, reason codes and subject types to the known lists", async () => {
    const bad = (cols: string, vals: string) => db.sql.unsafe(`insert into moderation_record (subject_type, subject_id, moderator_id, action${cols}) values ('revision', gen_random_uuid(), gen_random_uuid(), 'approve'${vals})`);
    await expect(db.sql.unsafe(`insert into moderation_record (subject_type, subject_id, moderator_id, action) values ('trail', gen_random_uuid(), gen_random_uuid(), 'approve')`)).rejects.toThrow();
    await expect(db.sql.unsafe(`insert into moderation_record (subject_type, subject_id, moderator_id, action) values ('revision', gen_random_uuid(), gen_random_uuid(), 'obliterate')`)).rejects.toThrow();
    await expect(bad(", reason_code", ", 'because'")).rejects.toThrow();
    await expect(bad(", reason_code", ", 'spam'")).resolves.toBeDefined();
  });

  it("keeps history when an account is deleted", async () => {
    const [u] = await db.sql`insert into app_user (email, display_name) values ('mod-gone@example.test', 'Gone') returning id`;
    await db.sql`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${u!.id}, 'moderator', 'approve', 'revision', gen_random_uuid())`;
    await expect(db.sql`delete from app_user where id = ${u!.id}`).resolves.toBeDefined();
    expect(await db.sql`select 1 from audit_log where actor_id = ${u!.id}`).toHaveLength(1);
  });

  it("adds approval tracking to submissions", async () => {
    const cols = (await db.sql`select column_name from information_schema.columns where table_name = 'submission'`).map((c) => c.column_name);
    expect(cols).toEqual(expect.arrayContaining(["first_approver", "first_approved_at", "decided_by", "decided_at"]));
  });
});
