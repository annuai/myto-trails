import { describe, expect, it } from "vitest";
import { NEAR_COOKIE, NEAR_COOKIE_MAX_AGE, parseNearCookie, roundPoint, serializeNearCookie } from "./near-cookie";

describe("near-me cookie", () => {
  it("rounds to two decimals (about 1 km) before anything is stored", () => {
    expect(roundPoint({ lat: 12.971599, lon: 77.594563 })).toEqual({ lat: 12.97, lon: 77.59 });
  });
  it("round-trips a point", () => {
    expect(parseNearCookie(serializeNearCookie({ lat: 12.9716, lon: 77.5946 }))).toEqual({ lat: 12.97, lon: 77.59 });
  });
  it("does not decode again: Next already decodes cookie values, so malformed percent sequences must not throw", () => {
    for (const v of ["%", "%E0%A4%A", "12.97%2C77.59", "%25"]) expect(() => parseNearCookie(v)).not.toThrow();
    expect(parseNearCookie("%")).toBeUndefined();
    expect(parseNearCookie("12.97%2C77.59")).toBeUndefined();
    expect(parseNearCookie("12.97,77.59")).toEqual({ lat: 12.97, lon: 77.59 });
  });
  it.each(["", "abc", "1,2,3", "NaN,5", "91,10", "10,181", "12.97", ",", "12.97,", "1e999,5"])("rejects %j", (v) => {
    expect(parseNearCookie(v)).toBeUndefined();
  });
  it("is short-lived and scoped to the trails section", () => {
    expect(NEAR_COOKIE).toBe("mt_near");
    expect(NEAR_COOKIE_MAX_AGE).toBeLessThanOrEqual(1800);
  });
});
