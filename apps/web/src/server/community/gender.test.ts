import { describe, expect, it } from "vitest";
import { isWomanOf, parseGender } from "./gender";

describe("parseGender", () => {
  it("accepts the three values and treats none, empty or null as prefer not to say", () => {
    expect(parseGender("male")).toBe("male");
    expect(parseGender("female")).toBe("female");
    expect(parseGender("other")).toBe("other");
    expect(parseGender("none")).toBeNull();
    expect(parseGender("")).toBeNull();
    expect(parseGender(null)).toBeNull();
    expect(parseGender(undefined)).toBeNull();
  });
  it("rejects anything else", () => {
    expect(parseGender("Female")).toBe("invalid");
    expect(parseGender("woman")).toBe("invalid");
    expect(parseGender(1)).toBe("invalid");
  });
});

describe("isWomanOf", () => {
  it("is true only for female, so women-only clubs keep working", () => {
    expect(isWomanOf("female")).toBe(true);
    expect(isWomanOf("male")).toBe(false);
    expect(isWomanOf("other")).toBe(false);
    expect(isWomanOf(null)).toBe(false);
  });
});
