import { describe, expect, it } from "vitest";
import { DEFAULT_RADIUS_KM, parseSearchParams, toSearchString } from "./search-params";

describe("parseSearchParams", () => {
  it("fills defaults for an empty query", () => {
    expect(parseSearchParams({})).toEqual({
      q: "", terrain: [], difficulty: [], access: [], suitable: [], verified: false, radius: DEFAULT_RADIUS_KM,
      sort: "recent", showClosed: false, view: "list", page: 1,
    });
  });
  it("reads text, place and filters, with comma lists and repeated keys", () => {
    const p = parseSearchParams({
      q: "  ridge  ", state: "kerala", district: "wayanad", terrain: "gravel,mud", difficulty: ["easy", "hard"],
      access: "public", suitable: "enduro", verified: "1", month: "11", minKm: "10", maxKm: "50.5",
      near: "bengaluru", radius: "100", sort: "nearest", closed: "1", view: "map", page: "3",
    });
    expect(p).toMatchObject({
      q: "ridge", state: "kerala", district: "wayanad", terrain: ["gravel", "mud"], difficulty: ["easy", "hard"],
      access: ["public"], suitable: ["enduro"], verified: true, month: 11, minKm: 10, maxKm: 50.5,
      near: "bengaluru", radius: 100, sort: "nearest", showClosed: true, view: "map", page: 3,
    });
  });
  it("defaults the sort to relevance with a text query and nearest with a place", () => {
    expect(parseSearchParams({ q: "ridge" }).sort).toBe("relevance");
    expect(parseSearchParams({ near: "me" }).sort).toBe("nearest");
    expect(parseSearchParams({ q: "ridge", sort: "distance" }).sort).toBe("distance");
  });
  it("drops unknown or invalid values instead of failing", () => {
    const p = parseSearchParams({
      terrain: "lava,gravel", difficulty: "impossible", access: "everyone", state: "Not A Slug", district: "x'; drop",
      month: "13", minKm: "-5", maxKm: "abc", radius: "9999", sort: "random", view: "globe", near: "UPPER CASE", page: "0",
    });
    expect(p).toMatchObject({ terrain: ["gravel"], difficulty: [], access: [], radius: DEFAULT_RADIUS_KM, view: "list", page: 1 });
    expect(p.state).toBeUndefined();
    expect(p.district).toBeUndefined();
    expect(p.month).toBeUndefined();
    expect(p.minKm).toBeUndefined();
    expect(p.maxKm).toBeUndefined();
    expect(p.near).toBeUndefined();
    expect(["recent", "relevance", "nearest", "distance", "difficulty"]).toContain(p.sort);
  });
  it("bounds page, text length and number magnitude", () => {
    expect(parseSearchParams({ page: "999999" }).page).toBe(1000);
    expect(parseSearchParams({ page: "-3" }).page).toBe(1);
    expect(parseSearchParams({ q: "x".repeat(500) }).q).toHaveLength(100);
    expect(parseSearchParams({ maxKm: "99999999" }).maxKm).toBe(5000);
  });
  it("never reads coordinates from the URL", () => {
    const p = parseSearchParams({ near: "me", lat: "12.9", lon: "77.5" });
    expect(JSON.stringify(p)).not.toContain("12.9");
    expect(JSON.stringify(p)).not.toContain("77.5");
  });
});

describe("toSearchString", () => {
  it("is empty for defaults", () => {
    expect(toSearchString(parseSearchParams({}))).toBe("");
  });
  it("omits defaults and keeps a stable key order", () => {
    const s = toSearchString(parseSearchParams({ view: "map", q: "ridge", state: "kerala", terrain: "mud,gravel", page: "2" }));
    expect(s).toBe("q=ridge&state=kerala&terrain=mud%2Cgravel&view=map&page=2");
  });
  it("round-trips", () => {
    const p = parseSearchParams({ q: "a b", near: "mysuru", radius: "50", access: "public,permission_required", closed: "1", minKm: "5" });
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(toSearchString(p))))).toEqual(p);
  });
  it("merges overrides and resets the page when filters change", () => {
    const base = parseSearchParams({ q: "x", page: "4" });
    expect(toSearchString({ ...base, terrain: ["mud"], page: 1 })).toBe("q=x&terrain=mud");
  });
});
