// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createToken, verifyToken } from "../api/tokens";
import { asAnon, createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { allowedRedirects, createAppCode, exchangeAppCode, isAllowedRedirect, pkceChallenge } from "./app-auth";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"; // RFC 7636 appendix B

describe("pkce and redirects", () => {
  it("matches the RFC 7636 test vector", () => {
    expect(pkceChallenge(VERIFIER)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("allows only listed redirects, and the local web build never in production", () => {
    const dev = allowedRedirects({ NODE_ENV: "development" });
    expect(isAllowedRedirect("myto://auth", dev)).toBe(true);
    expect(isAllowedRedirect("http://localhost:8081/auth/callback", dev)).toBe(true);
    expect(isAllowedRedirect("myto://auth.evil", dev)).toBe(false);
    expect(isAllowedRedirect("https://evil.example/cb", dev)).toBe(false);
    expect(allowedRedirects({ NODE_ENV: "production" })).toEqual(["myto://auth"]);
    expect(allowedRedirects({ NODE_ENV: "production", APP_REDIRECT_URIS: "https://moto-trails.com/app" })).toContain("https://moto-trails.com/app");
  });
});

describe("app_auth_code table", () => {
  it("is closed to the anonymous role", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select * from app_auth_code limit 1`)).rejects.toThrow(/permission denied/);
  });
});

describe("exchangeAppCode", () => {
  it("trades a code and the matching verifier for a working device token, once", async () => {
    const u = await makeUser(db.sql);
    const code = await createAppCode(db.sql, { userId: u, challenge: pkceChallenge(VERIFIER) });
    const [stored] = await db.sql`select code_hash from app_auth_code where user_id = ${u}`;
    expect(stored!.code_hash).not.toContain(code);
    const r = await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "app_android" });
    if (!r.ok) throw new Error(r.reason);
    expect(await verifyToken(db.sql, r.token)).toMatchObject({ userId: u, kind: "app_android", scopes: ["saved", "write:submission"] });
    expect(await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "app_android" })).toEqual({ ok: false, reason: "invalid_grant" });
  });

  it("rejects a wrong verifier and burns the code, so it cannot be guessed at", async () => {
    const u = await makeUser(db.sql);
    const code = await createAppCode(db.sql, { userId: u, challenge: pkceChallenge(VERIFIER) });
    const wrong = "x".repeat(43);
    expect(await exchangeAppCode(db.sql, { code, verifier: wrong, kind: "app_ios" })).toEqual({ ok: false, reason: "invalid_grant" });
    expect(await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "app_ios" })).toEqual({ ok: false, reason: "invalid_grant" });
  });

  it("rejects expired codes, unknown codes and bad requests", async () => {
    const u = await makeUser(db.sql);
    const code = await createAppCode(db.sql, { userId: u, challenge: pkceChallenge(VERIFIER) });
    await db.sql`update app_auth_code set expires_at = now() - interval '1 minute' where user_id = ${u}`;
    expect(await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "app_android" })).toEqual({ ok: false, reason: "invalid_grant" });
    expect(await exchangeAppCode(db.sql, { code: "a".repeat(43), verifier: VERIFIER, kind: "app_android" })).toEqual({ ok: false, reason: "invalid_grant" });
    expect(await exchangeAppCode(db.sql, { code, verifier: "short", kind: "app_android" })).toEqual({ ok: false, reason: "invalid_request" });
    expect(await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "navi" })).toEqual({ ok: false, reason: "invalid_request" });
  });

  it("refuses a code once the account holds ten device tokens", async () => {
    const u = await makeUser(db.sql);
    for (let n = 0; n < 10; n++) await createToken(db.sql, { userId: u, kind: "app_android", label: `d${n}`, scopes: ["saved"] });
    const code = await createAppCode(db.sql, { userId: u, challenge: pkceChallenge(VERIFIER) });
    expect(await exchangeAppCode(db.sql, { code, verifier: VERIFIER, kind: "app_android" })).toEqual({ ok: false, reason: "too_many_tokens" });
  });
});
