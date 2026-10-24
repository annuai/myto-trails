import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it.each(["/", "/saved", "/trails/some-trail", "/trails?q=ridge&page=2", "/regions/kerala#top"])("keeps %s", (p) => {
    expect(safeNextPath(p)).toBe(p);
  });
  it.each([
    "//evil.example", "/\\evil.example", "https://evil.example", "http://evil.example/x", "javascript:alert(1)", "data:text/html,x",
    "evil.example", "", "   ", "/%2F/evil.example", "/%5Cevil.example", "/\u0000", "/a\nb", "///evil", "/ /evil",
  ])("replaces %j with the fallback", (p) => {
    expect(safeNextPath(p)).toBe("/");
  });
  it("handles missing values and custom fallbacks", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null, "/saved")).toBe("/saved");
    expect(safeNextPath("//evil", "/saved")).toBe("/saved");
  });
  it("rejects absurdly long paths", () => {
    expect(safeNextPath(`/${"a".repeat(3000)}`)).toBe("/");
  });
});
