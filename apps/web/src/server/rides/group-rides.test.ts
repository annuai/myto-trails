// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expiresAt, generateCode, HARD_CAP_MS, IDLE_MS, isExpired, isFresh, normalizeCode, STALE_MS } from "./group-rides";

const t0 = new Date("2026-11-01T06:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);
const H = 3_600_000;

describe("group ride codes", () => {
  it("makes six characters from an alphabet without look-alikes", () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(generateCode(() => 0)).toBe("AAAAAA");
  });

  it("reads a typed code without caring about case or spaces, and refuses a non-code", () => {
    expect(normalizeCode(" abc 234 ")).toBe("ABC234");
    expect(normalizeCode("ABCDE")).toBeNull();
    expect(normalizeCode("ABCDE0")).toBeNull();
    expect(normalizeCode("ABCDEI")).toBeNull();
    expect(normalizeCode(undefined)).toBeNull();
  });
});

describe("group ride lifetime", () => {
  it("ends 12 hours after the last activity", () => {
    expect(expiresAt(t0, at(2 * H)).getTime()).toBe(at(2 * H + IDLE_MS).getTime());
    expect(isExpired({ createdAt: t0, lastActivityAt: at(2 * H), endedAt: null }, at(13 * H))).toBe(false);
    expect(isExpired({ createdAt: t0, lastActivityAt: at(2 * H), endedAt: null }, at(14 * H))).toBe(true);
  });

  it("never lives past 72 hours, however busy", () => {
    expect(expiresAt(t0, at(70 * H)).getTime()).toBe(at(HARD_CAP_MS).getTime());
    expect(isExpired({ createdAt: t0, lastActivityAt: at(71 * H), endedAt: null }, at(73 * H))).toBe(true);
  });

  it("is over once ended", () => {
    expect(isExpired({ createdAt: t0, lastActivityAt: t0, endedAt: at(1) }, at(2))).toBe(true);
  });
});

describe("a rider's position", () => {
  it("shows for five minutes after the last update, then not", () => {
    expect(isFresh(at(0), at(STALE_MS - 1))).toBe(true);
    expect(isFresh(at(0), at(STALE_MS))).toBe(false);
    expect(isFresh(null, at(0))).toBe(false);
  });
});
