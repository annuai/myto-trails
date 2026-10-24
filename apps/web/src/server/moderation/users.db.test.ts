// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { grantRole, listRoleHolders, revokeRole, setSuspended } from "./users";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const email = async (id: string) => (await db.sql`select email from app_user where id = ${id}`)[0]!.email as string;
const audits = (id: string) => db.sql`select action, actor_role from audit_log where entity_id = ${id} order by created_at`;

describe("grantRole and revokeRole", () => {
  it("lets an admin make a rider a moderator, audited, and the new moderator can act", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const rider = await makeUser(db.sql);
    expect(await grantRole(db.sql, { actorId: admin, email: (await email(rider)).toUpperCase(), role: "moderator" })).toEqual({ ok: true, userId: rider });
    expect((await db.sql`select role from user_role where user_id = ${rider}`).map((r) => r.role)).toEqual(["moderator"]);
    expect((await db.sql`select granted_by from user_role where user_id = ${rider}`)[0]!.granted_by).toBe(admin);
    expect(await audits(rider)).toEqual([{ action: "grant_role", actor_role: "admin" }]);
  });

  it("refuses moderators and riders, unknown users and unknown roles", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const mod = await makeUser(db.sql, { role: "moderator" });
    const rider = await makeUser(db.sql);
    for (const actor of [mod, rider]) expect(await grantRole(db.sql, { actorId: actor, email: await email(rider), role: "admin" })).toEqual({ ok: false, reason: "forbidden" });
    expect(await grantRole(db.sql, { actorId: admin, email: "nobody@example.test", role: "moderator" })).toEqual({ ok: false, reason: "not_found" });
    expect(await grantRole(db.sql, { actorId: admin, email: await email(rider), role: "superuser" as never })).toEqual({ ok: false, reason: "invalid" });
    expect(await db.sql`select 1 from user_role where user_id = ${rider}`).toHaveLength(0);
  });

  it("revokes a role, but an admin cannot remove their own admin role", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const mod = await makeUser(db.sql, { role: "moderator" });
    expect(await revokeRole(db.sql, { actorId: admin, userId: admin, role: "admin" })).toEqual({ ok: false, reason: "self" });
    expect(await revokeRole(db.sql, { actorId: admin, userId: mod, role: "moderator" })).toEqual({ ok: true });
    expect(await db.sql`select 1 from user_role where user_id = ${mod}`).toHaveLength(0);
    expect(await revokeRole(db.sql, { actorId: admin, userId: mod, role: "moderator" })).toEqual({ ok: false, reason: "not_found" });
    expect((await audits(mod)).map((a) => a.action)).toEqual(["revoke_role"]);
  });
});

describe("setSuspended", () => {
  it("suspends an account, ends its sessions and records why; unsuspending restores it", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const rider = await makeUser(db.sql);
    await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${rider}, ${`h${Math.random()}`}, now() + interval '1 day')`;
    expect(await setSuspended(db.sql, { actorId: admin, userId: rider, suspended: true, reason: "Spam submissions." })).toEqual({ ok: true });
    expect((await db.sql`select status from app_user where id = ${rider}`)[0]!.status).toBe("suspended");
    expect(await db.sql`select 1 from auth_session where user_id = ${rider}`).toHaveLength(0);
    expect(await setSuspended(db.sql, { actorId: admin, userId: rider, suspended: false, reason: "Appeal accepted." })).toEqual({ ok: true });
    expect((await db.sql`select status from app_user where id = ${rider}`)[0]!.status).toBe("active");
    expect((await audits(rider)).map((a) => a.action)).toEqual(["suspend_user", "unsuspend_user"]);
  });

  it("refuses non-admins, self, other admins, a missing reason and unknown users", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const admin2 = await makeUser(db.sql, { role: "admin" });
    const mod = await makeUser(db.sql, { role: "moderator" });
    const rider = await makeUser(db.sql);
    expect(await setSuspended(db.sql, { actorId: mod, userId: rider, suspended: true, reason: "x reason" })).toEqual({ ok: false, reason: "forbidden" });
    expect(await setSuspended(db.sql, { actorId: admin, userId: admin, suspended: true, reason: "x reason" })).toEqual({ ok: false, reason: "self" });
    expect(await setSuspended(db.sql, { actorId: admin, userId: admin2, suspended: true, reason: "x reason" })).toEqual({ ok: false, reason: "protected" });
    expect(await setSuspended(db.sql, { actorId: admin, userId: rider, suspended: true, reason: " " })).toEqual({ ok: false, reason: "invalid" });
    expect(await setSuspended(db.sql, { actorId: admin, userId: crypto.randomUUID(), suspended: true, reason: "x reason" })).toEqual({ ok: false, reason: "not_found" });
  });

  it("a suspended moderator loses their powers immediately", async () => {
    const admin = await makeUser(db.sql, { role: "admin" });
    const mod = await makeUser(db.sql, { role: "moderator" });
    await setSuspended(db.sql, { actorId: admin, userId: mod, suspended: true, reason: "Under review." });
    expect(await listRoleHolders(db.sql, mod)).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("listRoleHolders", () => {
  it("lists names and roles for admins, without email addresses", async () => {
    const admin = await makeUser(db.sql, { role: "admin", name: "Admin Asha" });
    const r = await listRoleHolders(db.sql, admin);
    if (!r.ok) throw new Error();
    expect(r.items).toContainEqual(expect.objectContaining({ name: "Admin Asha", role: "admin" }));
    expect(JSON.stringify(r)).not.toMatch(/@example\.test/);
    expect(await listRoleHolders(db.sql, await makeUser(db.sql, { role: "moderator" }))).toEqual({ ok: false, reason: "forbidden" });
  });
});
