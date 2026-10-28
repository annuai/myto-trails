import { describe, expect, it } from "vitest";
import { resolveBikeImage } from "@moto-trails/domain";
import { bikeFromRow, pickVariant } from "./profile";

describe("pickVariant", () => {
  const v = { "1200": "c", "400": "a", "800": "b" };
  it("takes the smallest variant that is wide enough", () => expect(pickVariant(v, 500)).toBe("b"));
  it("falls back to the largest when none is wide enough", () => expect(pickVariant(v, 4000)).toBe("c"));
  it("returns null without variants", () => {
    expect(pickVariant({}, 200)).toBeNull();
    expect(pickVariant(null, 200)).toBeNull();
  });
});

describe("resolveBikeImage: the rider's own photo, else the catalogue image, else none", () => {
  const own = { "400": "own-400", "800": "own-800" };
  const cat = { "400": "cat-400", "800": "cat-800", "1200": "cat-1200" };
  it("prefers the rider's own photo", () => expect(resolveBikeImage(own, cat, 400)).toEqual({ url: "own-400", own: true }));
  it("falls back to the catalogue image", () => expect(resolveBikeImage(null, cat, 800)).toEqual({ url: "cat-800", own: false }));
  it("treats a photo without variants as no photo", () => expect(resolveBikeImage({}, cat, 1200)).toEqual({ url: "cat-1200", own: false }));
  it("is none when neither exists", () => expect(resolveBikeImage(null, {}, 400)).toEqual({ url: null, own: false }));
  it("accepts a plain URL for either source", () => expect(resolveBikeImage("u", cat, 400)).toEqual({ url: "u", own: true }));
  it("builds the shared Bike shape", () => {
    expect(bikeFromRow({ name: "Scram", model_year: 2023, bike_model_id: "m1", own_variants: null, catalogue_variants: cat }, 400)).toEqual({ name: "Scram", modelYear: 2023, photoUrl: "cat-400", ownPhoto: false, bikeModelId: "m1" });
  });
});
