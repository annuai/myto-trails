import { describe, expect, it } from "vitest";
import { BIKE_CATEGORIES, pickVariant, resolveBikeImage } from "./bikes";

const own = { "400": "own-400", "800": "own-800" };
const preset = { "400": "cat-400", "800": "cat-800", "1200": "cat-1200" };

describe("pickVariant", () => {
  it("takes the smallest variant that is wide enough, else the largest", () => {
    expect(pickVariant(preset, 500)).toBe("cat-800");
    expect(pickVariant(preset, 4000)).toBe("cat-1200");
  });
  it("returns null without variants", () => {
    expect(pickVariant({}, 400)).toBeNull();
    expect(pickVariant(null, 400)).toBeNull();
  });
});

describe("resolveBikeImage", () => {
  it("prefers the rider's own photo, then the catalogue image, then none", () => {
    expect(resolveBikeImage(own, preset, 400)).toEqual({ url: "own-400", own: true });
    expect(resolveBikeImage(null, preset, 800)).toEqual({ url: "cat-800", own: false });
    expect(resolveBikeImage(undefined, null, 800)).toEqual({ url: null, own: false });
  });
  it("accepts a single URL, and treats an empty one as missing", () => {
    expect(resolveBikeImage("file://photo.jpg", preset, 400)).toEqual({ url: "file://photo.jpg", own: true });
    expect(resolveBikeImage("", "file://preset.webp", 400)).toEqual({ url: "file://preset.webp", own: false });
  });
});

describe("BIKE_CATEGORIES", () => { it("has the eleven catalogue categories", () => expect(BIKE_CATEGORIES).toHaveLength(11)); });
