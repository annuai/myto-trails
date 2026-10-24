// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { completeWelcome, getMemberState, isMember, updateMemberPrivacy } from "./members";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

describe("completeWelcome", () => {
  it("records the declaration time, the display name and the privacy choices", async () => {
    const u = await makeUser(db.sql);
    expect(await isMember(db.sql, u)).toBe(false);
    const r = await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "  Annuai  ", profilePublic: true, isWoman: false });
    expect(r).toEqual({ ok: true });
    expect(await isMember(db.sql, u)).toBe(true);
    expect(await getMemberState(db.sql, u)).toMatchObject({ confirmed: true, displayName: "Annuai", profilePublic: true, isWoman: false });
  });

  it("refuses without the declaration, with a bad name, or for unknown users, and changes nothing", async () => {
    const u = await makeUser(db.sql);
    expect(await completeWelcome(db.sql, { userId: u, confirmed: false, displayName: "Fine Name", profilePublic: true, isWoman: false })).toEqual({ ok: false, reason: "declaration_required" });
    expect(await completeWelcome(db.sql, { userId: u, confirmed: "true" as never, displayName: "Fine Name", profilePublic: true, isWoman: false })).toEqual({ ok: false, reason: "declaration_required" });
    expect(await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "x", profilePublic: true, isWoman: false })).toEqual({ ok: false, reason: "invalid" });
    expect(await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "y".repeat(41), profilePublic: true, isWoman: false })).toEqual({ ok: false, reason: "invalid" });
    expect(await completeWelcome(db.sql, { userId: crypto.randomUUID(), confirmed: true, displayName: "Fine Name", profilePublic: false, isWoman: false })).toEqual({ ok: false, reason: "not_found" });
    expect(await isMember(db.sql, u)).toBe(false);
    expect((await getMemberState(db.sql, u))!.profilePublic).toBe(false);
  });

  it("keeps the first declaration time when repeated", async () => {
    const u = await makeUser(db.sql);
    await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "First Name", profilePublic: false, isWoman: false });
    const [a] = await db.sql`select adult_confirmed_at from app_user where id = ${u}`;
    await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "Second Name", profilePublic: true, isWoman: false });
    const [b] = await db.sql`select adult_confirmed_at from app_user where id = ${u}`;
    expect(b!.adult_confirmed_at).toEqual(a!.adult_confirmed_at);
  });
});

describe("isMember", () => {
  it("is false for suspended or unknown users and for junk ids", async () => {
    const u = await makeUser(db.sql);
    await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "Some Name", profilePublic: false, isWoman: false });
    await db.sql`update app_user set status = 'suspended' where id = ${u}`;
    expect(await isMember(db.sql, u)).toBe(false);
    expect(await isMember(db.sql, crypto.randomUUID())).toBe(false);
    expect(await isMember(db.sql, "nope")).toBe(false);
  });
});

describe("updateMemberPrivacy", () => {
  it("changes visibility, the private women-rider setting and the bio, only for members", async () => {
    const u = await makeUser(db.sql);
    expect(await updateMemberPrivacy(db.sql, { userId: u, profilePublic: true, isWoman: true, bio: "Weekend rider" })).toEqual({ ok: false, reason: "not_member" });
    await completeWelcome(db.sql, { userId: u, confirmed: true, displayName: "Some Name", profilePublic: false, isWoman: false });
    expect(await updateMemberPrivacy(db.sql, { userId: u, profilePublic: true, isWoman: true, bio: " Weekend rider " })).toEqual({ ok: true });
    expect(await getMemberState(db.sql, u)).toMatchObject({ profilePublic: true, isWoman: true, bio: "Weekend rider" });
    expect(await updateMemberPrivacy(db.sql, { userId: u, profilePublic: true, isWoman: true, bio: "x".repeat(301) })).toEqual({ ok: false, reason: "invalid" });
  });
});
