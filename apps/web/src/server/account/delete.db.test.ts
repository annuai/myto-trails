// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "../storage";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { deleteAccount } from "./delete";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const remove = vi.fn(async () => {});
const storage = { remove } as unknown as StorageProvider;
let n = 0;
const club = async (members: [string, "admin" | "member"][]) => {
  const [c] = await db.sql`insert into club (name, created_by) values (${`Trail Club ${++n}`}, ${members[0]![0]}) returning id`;
  for (const [userId, role] of members) await db.sql`insert into club_member (club_id, user_id, role) values (${c!.id}, ${userId}, ${role})`;
  return c!.id as string;
};
const exists = async (id: string) => (await db.sql`select 1 as x from app_user where id = ${id}`).length === 1;

describe("deleteAccount", () => {
  it("removes the account and its sessions, and tells the caller nothing else is needed", async () => {
    const id = await makeUser(db.sql, { name: "Asha" });
    await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${id}, ${`h${++n}`}, now() + interval '1 day')`;
    expect(await deleteAccount(db.sql, storage, id)).toEqual({ ok: true });
    expect(await exists(id)).toBe(false);
    expect(await db.sql`select 1 from auth_session where user_id = ${id}`).toHaveLength(0);
  });

  it("is a no-op for an account that is already gone", async () => {
    expect(await deleteAccount(db.sql, storage, "00000000-0000-4000-8000-000000000000")).toEqual({ ok: true });
  });

  it("refuses while the only admin of a club other people belong to, and names the club", async () => {
    const owner = await makeUser(db.sql, { name: "Owner" });
    const other = await makeUser(db.sql, { name: "Other" });
    const id = await club([[owner, "admin"], [other, "member"]]);
    const r = await deleteAccount(db.sql, storage, owner);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.clubs).toHaveLength(1);
    expect(await exists(owner)).toBe(true);

    await db.sql`update club_member set role = 'admin' where club_id = ${id} and user_id = ${other}`;
    expect(await deleteAccount(db.sql, storage, owner)).toEqual({ ok: true });
    expect(await exists(owner)).toBe(false);
    expect(await exists(other)).toBe(true);
    expect(await db.sql`select 1 from club where id = ${id}`).toHaveLength(1);
    expect(await db.sql`select created_by from club where id = ${id}`).toEqual([{ created_by: null }]);
  });

  it("deletes a club that nobody else belongs to", async () => {
    const owner = await makeUser(db.sql, { name: "Solo" });
    const id = await club([[owner, "admin"]]);
    expect(await deleteAccount(db.sql, storage, owner)).toEqual({ ok: true });
    expect(await db.sql`select 1 from club where id = ${id}`).toHaveLength(0);
  });

  it("removes the stored files of the person's own uploads after the account is gone", async () => {
    const id = await makeUser(db.sql, { name: "Uploader" });
    await db.sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes) values (${id}, 'image', 'originals', ${`originals/${++n}.jpg`}, 'image/jpeg', 10)`;
    remove.mockClear();
    expect(await deleteAccount(db.sql, storage, id)).toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith("originals", expect.stringContaining("originals/"));
  });
});
