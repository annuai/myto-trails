import { describe, expect, it } from "vitest";
import { WOMEN_SAFE_CONFIRMED_AT } from "@moto-trails/domain";
import { canMarkWomenSafe, summarizeWomenSafe, womenSafeCutoff } from "./women-safe";

describe("womenSafeCutoff", () => {
  it("is 24 months before now", () => {
    expect(womenSafeCutoff(new Date("2026-11-01T10:30:00Z")).toISOString()).toBe("2024-11-01T10:30:00.000Z");
  });
  it("clamps the end of a month that does not exist two years earlier", () => {
    expect(womenSafeCutoff(new Date("2028-02-29T00:00:00Z")).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("canMarkWomenSafe", () => {
  it("needs a declared member whose private gender is female", () => {
    expect(canMarkWomenSafe({ confirmed: true, gender: "female" })).toBe(true);
    expect(canMarkWomenSafe({ confirmed: true, gender: "male" })).toBe(false);
    expect(canMarkWomenSafe({ confirmed: true, gender: "other" })).toBe(false);
    expect(canMarkWomenSafe({ confirmed: true, gender: null })).toBe(false);
    expect(canMarkWomenSafe({ confirmed: false, gender: "female" })).toBe(false);
    expect(canMarkWomenSafe(null)).toBe(false);
  });
});

describe("summarizeWomenSafe", () => {
  it("is confirmed from three riders", () => {
    expect(summarizeWomenSafe({ count: WOMEN_SAFE_CONFIRMED_AT - 1, mine: false, canMark: false }).confirmed).toBe(false);
    expect(summarizeWomenSafe({ count: WOMEN_SAFE_CONFIRMED_AT, mine: false, canMark: false }).confirmed).toBe(true);
  });
  it("keeps an existing mark removable even if the rider can no longer mark", () => {
    expect(summarizeWomenSafe({ count: 5, mine: true, canMark: false })).toEqual({ count: 5, confirmed: true, mine: true, canMark: false });
    expect(summarizeWomenSafe({ count: 1, mine: true, canMark: true })).toEqual({ count: 1, confirmed: false, mine: true, canMark: true });
  });
});
