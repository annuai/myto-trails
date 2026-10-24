import { describe, expect, it } from "vitest";
import { INDIA_STATES, isRegionIndexable } from "./regions";
import { isValidSlug } from "./slug";

describe("isRegionIndexable", () => {
  it.each([[0, false], [1, false], [2, false], [3, true], [50, true]])("%i trails -> %s", (n, expected) => {
    expect(isRegionIndexable(n)).toBe(expected);
  });
});

describe("INDIA_STATES", () => {
  it("has 28 states and 8 union territories with unique names and valid unique slugs", () => {
    expect(INDIA_STATES).toHaveLength(36);
    expect(INDIA_STATES.filter((s) => s.kind === "state")).toHaveLength(28);
    expect(INDIA_STATES.filter((s) => s.kind === "ut")).toHaveLength(8);
    expect(new Set(INDIA_STATES.map((s) => s.name)).size).toBe(36);
    expect(new Set(INDIA_STATES.map((s) => s.slug)).size).toBe(36);
    expect(INDIA_STATES.every((s) => isValidSlug(s.slug))).toBe(true);
  });
  it("includes known entries", () => {
    const slugs = INDIA_STATES.map((s) => s.slug);
    expect(slugs).toContain("kerala");
    expect(slugs).toContain("jammu-and-kashmir");
    expect(slugs).toContain("meghalaya");
  });
});
