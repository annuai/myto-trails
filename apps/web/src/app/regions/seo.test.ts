import { describe, expect, it } from "vitest";
import { regionMetadata } from "./seo";

const region = (n: number) => ({ kind: "state" as const, name: "Kerala", slug: "kerala", parentSlug: "india", publishedTrailCount: n, countrySlug: "india", countryIso2: "IN" });

describe("regionMetadata", () => {
  it.each([[0, false], [1, false], [2, false], [3, true], [40, true]])("%i trails -> index %s", (n, index) => {
    expect(regionMetadata(region(n)).robots).toEqual({ index, follow: true });
  });
  it("describes the region and counts trails with the right plural", () => {
    expect(regionMetadata(region(1)).description).toContain("1 published motorcycle trail in Kerala");
    expect(regionMetadata(region(3)).description).toContain("3 published motorcycle trails in Kerala");
  });
  it("titles the page with the region name", () => {
    expect(regionMetadata(region(3)).title).toBe("Motorcycle trails in Kerala");
  });
});
