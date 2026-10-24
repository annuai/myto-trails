import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Kudremukh Forest Track!", "kudremukh-forest-track"],
    ["Café Ghāt", "cafe-ghat"],
    ["  A -- B  ", "a-b"],
    ["Sample  Ridge/Track_2", "sample-ridge-track-2"],
    ["!!!", ""],
    ["", ""],
  ])("%j -> %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
  it("truncates to 80 characters without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(79)} bbbb`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });
});

describe("isValidSlug", () => {
  it.each(["a", "kerala", "a-b-c", "trail-2", "a".repeat(80)])("accepts %j", (s) => {
    expect(isValidSlug(s)).toBe(true);
  });
  it.each(["", "A", "a--b", "-a", "a-", "a".repeat(81), "a/b", "a b", "é", "a_b"])("rejects %j", (s) => {
    expect(isValidSlug(s)).toBe(false);
  });
});
