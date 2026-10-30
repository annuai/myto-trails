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
  it("finds literals hidden in a condition, and shadow and layer values", () => {
    expect(findHardcodedSizes("{ gap: landscape ? 12 : space[5], maxWidth: wide ? space[8] : 520, shadowRadius: 24, elevation: 8, zIndex: 3 }")).toEqual([
      "gap: landscape ? 12", "maxWidth: wide ? space[8] : 520", "shadowRadius: 24", "elevation: 8", "zIndex: 3",
    ]);
  });
  it("allows 0 and 1 in a condition, and tokens on both sides", () => {
    expect(findHardcodedSizes("{ marginTop: first ? 0 : rhythm.betweenSections, opacity: busy ? opacity.disabled : 1, zIndex: 1, paddingBottom: keyboard ? keyboard + space[4] : 0 }")).toEqual([]);
  });
});
