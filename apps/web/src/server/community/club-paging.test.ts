// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CLUB_PAGE_DEFAULT, CLUB_PAGE_MAX, clubPageSize, clubSearchPattern, decodeClubCursor, encodeClubCursor } from "./club-paging";

const id = "6f1d2c3e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

describe("club cursor", () => {
  it("round-trips a place in the list, keeping microseconds", () => {
    const c = { at: "2026-10-30 12:34:56.123456+00", id };
    expect(decodeClubCursor(encodeClubCursor(c))).toEqual(c);
  });
  it("means the start when there is none", () => { expect(decodeClubCursor(undefined)).toBeUndefined(); expect(decodeClubCursor("")).toBeUndefined(); });
  it("rejects anything that is not ours, including an attempt to inject SQL", () => {
    expect(decodeClubCursor("not-base64-json")).toBeNull();
    expect(decodeClubCursor(Buffer.from(JSON.stringify(["2026-10-30 12:00:00", "x'; drop table club;--"])).toString("base64url"))).toBeNull();
    expect(decodeClubCursor(Buffer.from(JSON.stringify(["yesterday", id])).toString("base64url"))).toBeNull();
    expect(decodeClubCursor(Buffer.from(JSON.stringify({ at: 1 })).toString("base64url"))).toBeNull();
  });
});

describe("club page size", () => {
  it("defaults, clamps and ignores junk", () => {
    expect(clubPageSize(undefined)).toBe(CLUB_PAGE_DEFAULT);
    expect(clubPageSize("abc")).toBe(CLUB_PAGE_DEFAULT);
    expect(clubPageSize("")).toBe(CLUB_PAGE_DEFAULT);
    expect(clubPageSize("0")).toBe(1);
    expect(clubPageSize("-5")).toBe(1);
    expect(clubPageSize("7.9")).toBe(7);
    expect(clubPageSize("100000")).toBe(CLUB_PAGE_MAX);
  });
});

describe("club search pattern", () => {
  it("matches the words anywhere", () => expect(clubSearchPattern("  Nandi   riders ")).toBe("%Nandi riders%"));
  it("takes % _ and backslash literally", () => expect(clubSearchPattern("50%_off\\")).toBe("%50\\%\\_off\\\\%"));
  it("is null when nothing is typed", () => { expect(clubSearchPattern(undefined)).toBeNull(); expect(clubSearchPattern("   ")).toBeNull(); expect(clubSearchPattern(5)).toBeNull(); });
  it("cuts a very long search", () => expect(clubSearchPattern("a".repeat(500))!.length).toBe(62));
});
