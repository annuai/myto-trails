import { describe, expect, it } from "vitest";
import { findHardcodedSizes } from "./find-hardcoded-sizes";

describe("findHardcodedSizes", () => {
  it("finds literal sizes, spacing, radii and opacities", () => {
    expect(findHardcodedSizes("{ padding: 20, gap: 12, borderRadius: 24, fontSize: 17, opacity: 0.45, width: 56 }")).toEqual([
      "padding: 20", "gap: 12", "borderRadius: 24", "fontSize: 17", "opacity: 0.45", "width: 56",
    ]);
  });
  it("finds directional padding and rgba colours", () => {
    expect(findHardcodedSizes("{ paddingHorizontal: 18, backgroundColor: 'rgba(0,0,0,0.1)' }")).toEqual(["paddingHorizontal: 18", "rgba("]);
  });
  it("allows 0, 1, percentages and token references", () => {
    expect(findHardcodedSizes("{ padding: 0, borderWidth: 1, width: '100%', height: '100%', gap: space[3], top: 0 }")).toEqual([]);
  });
  it("ignores comments and type annotations", () => {
    expect(findHardcodedSizes("// padding: 20\n/* gap: 12 */ type P = { height: number }")).toEqual([]);
  });
});
