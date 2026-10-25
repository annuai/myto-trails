import { describe, expect, it } from "vitest";
import { pickVariant } from "./profile";

describe("pickVariant", () => {
  const v = { "1200": "c", "400": "a", "800": "b" };
  it("takes the smallest variant that is wide enough", () => expect(pickVariant(v, 500)).toBe("b"));
  it("falls back to the largest when none is wide enough", () => expect(pickVariant(v, 4000)).toBe("c"));
  it("returns null without variants", () => {
    expect(pickVariant({}, 200)).toBeNull();
    expect(pickVariant(null, 200)).toBeNull();
  });
});
