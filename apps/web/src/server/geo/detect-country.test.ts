import { describe, expect, it } from "vitest";
import { detectCountry, parseCountryCookie, resolveBrowsingCountry } from "./detect-country";

const headers = (v: string | null) => ({ get: () => v });
const open = new Set(["IN"]);

describe("detectCountry", () => {
  it("reads the platform header in upper case", () => {
    expect(detectCountry(headers("in"))).toBe("IN");
  });
  it("ignores anything that is not a two-letter code", () => {
    expect(detectCountry(headers("xx1"))).toBeNull();
    expect(detectCountry(headers(null))).toBeNull();
  });
});

describe("parseCountryCookie", () => {
  it("accepts two letters only", () => {
    expect(parseCountryCookie("in")).toBe("IN");
    expect(parseCountryCookie("india")).toBeNull();
    expect(parseCountryCookie(undefined)).toBeNull();
  });
});

describe("resolveBrowsingCountry", () => {
  it("prefers the visitor's own choice", () => {
    expect(resolveBrowsingCountry({ cookie: "IN", detected: "NP", open })).toEqual({ iso2: "IN", source: "chosen", notOpenYet: null });
  });
  it("uses the detected country when it is open", () => {
    expect(resolveBrowsingCountry({ cookie: null, detected: "IN", open })).toEqual({ iso2: "IN", source: "detected", notOpenYet: null });
  });
  it("shows everything open, and says so, when the visitor is somewhere we are not open yet", () => {
    expect(resolveBrowsingCountry({ cookie: null, detected: "NP", open })).toEqual({ iso2: null, source: "none", notOpenYet: "NP" });
  });
  it("ignores a chosen country that is not open", () => {
    expect(resolveBrowsingCountry({ cookie: "NP", detected: null, open }).iso2).toBeNull();
  });
});
