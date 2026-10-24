// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { createToken, listTokens, revokeToken, verifyToken } from "./tokens";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

describe("api_token table", () => {
  it("is closed to the anonymous role", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select * from api_token limit 1`)).rejects.toThrow(/permission denied/);
  });
});

describe("createToken and verifyToken", () => {
  it("returns the plaintext once, stores only its hash, and verifies with the granted scopes", async () => {
    const u = await makeUser(db.sql);
    const r = await createToken(db.sql, { userId: u, kind: "navi", label: "My Navi", scopes: ["saved"] });
    if (!r.ok) throw new Error(r.reason);
    expect(r.token).toMatch(/^mt_[A-Za-z0-9_-]{43}$/);
    const [row] = await db.sql`select token_hash from api_token where id = ${r.id}`;
    expect(row!.token_hash).not.toContain(r.token);
    expect(row!.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyToken(db.sql, r.token)).toEqual({ userId: u, tokenId: r.id, scopes: ["saved"], kind: "navi" });
    expect((await db.sql`select last_used_at from api_token where id = ${r.id}`)[0]!.last_used_at).not.toBeNull();
  });

  it.each([["", ], ["mt_nope"], ["garbage"], ["Bearer x"], [`mt_${"a".repeat(43)}`]])("rejects the unknown token %j", async (t) => {
    expect(await verifyToken(db.sql, t)).toBeNull();
  });

  it("rejects revoked tokens and tokens of suspended users", async () => {
    const u = await makeUser(db.sql);
    const a = await createToken(db.sql, { userId: u, kind: "app_android", label: "Phone", scopes: ["saved"] });
    const b = await createToken(db.sql, { userId: u, kind: "app_android", label: "Tablet", scopes: ["saved"] });
    if (!a.ok || !b.ok) throw new Error();
    expect(await revokeToken(db.sql, { userId: u, tokenId: a.id })).toEqual({ ok: true });
    expect(await verifyToken(db.sql, a.token)).toBeNull();
    await db.sql`update app_user set status = 'suspended' where id = ${u}`;
    expect(await verifyToken(db.sql, b.token)).toBeNull();
  });

  it("validates kind, label and scopes, and limits tokens per user", async () => {
    const u = await makeUser(db.sql);
    expect(await createToken(db.sql, { userId: u, kind: "toaster" as never, label: "x", scopes: ["saved"] })).toEqual({ ok: false, reason: "invalid" });
    expect(await createToken(db.sql, { userId: u, kind: "navi", label: "  ", scopes: ["saved"] })).toEqual({ ok: false, reason: "invalid" });
    expect(await createToken(db.sql, { userId: u, kind: "navi", label: "x".repeat(61), scopes: ["saved"] })).toEqual({ ok: false, reason: "invalid" });
    expect(await createToken(db.sql, { userId: u, kind: "navi", label: "ok", scopes: [] })).toEqual({ ok: false, reason: "invalid" });
    expect(await createToken(db.sql, { userId: u, kind: "navi", label: "ok", scopes: ["admin" as never] })).toEqual({ ok: false, reason: "invalid" });
    for (let i = 0; i < 10; i++) expect((await createToken(db.sql, { userId: u, kind: "navi", label: `d${i}`, scopes: ["saved"] })).ok).toBe(true);
    expect(await createToken(db.sql, { userId: u, kind: "navi", label: "eleven", scopes: ["saved"] })).toEqual({ ok: false, reason: "too_many" });
  });
});

describe("revokeToken and listTokens", () => {
  it("lists only the user's own tokens, never exposing hashes, and refuses to revoke someone else's", async () => {
    const a = await makeUser(db.sql);
    const b = await makeUser(db.sql);
    const t = await createToken(db.sql, { userId: a, kind: "navi", label: "Mine", scopes: ["saved", "write:submission"] });
    if (!t.ok) throw new Error();
    const list = await listTokens(db.sql, a);
    expect(list).toEqual([expect.objectContaining({ id: t.id, label: "Mine", kind: "navi", scopes: ["saved", "write:submission"], revoked: false })]);
    expect(JSON.stringify(list)).not.toMatch(/token_hash|hash/i);
    expect(await listTokens(db.sql, b)).toEqual([]);
    expect(await revokeToken(db.sql, { userId: b, tokenId: t.id })).toEqual({ ok: false, reason: "not_found" });
    expect(await revokeToken(db.sql, { userId: a, tokenId: "nope" })).toEqual({ ok: false, reason: "not_found" });
    expect((await verifyToken(db.sql, t.token))?.userId).toBe(a);
  });
});
