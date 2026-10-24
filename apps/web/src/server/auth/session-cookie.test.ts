import { describe, expect, it } from "vitest";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-cookie";

describe("session cookie", () => {
  it("is named mt_session and always HttpOnly, SameSite=Lax and site-wide", () => {
    expect(SESSION_COOKIE).toBe("mt_session");
    for (const production of [true, false]) {
      expect(sessionCookieOptions(production)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    }
  });
  it("is Secure in production only and lasts 30 days", () => {
    expect(sessionCookieOptions(true).secure).toBe(true);
    expect(sessionCookieOptions(false).secure).toBe(false);
    expect(sessionCookieOptions(true).maxAge).toBe(30 * 24 * 60 * 60);
  });
});
