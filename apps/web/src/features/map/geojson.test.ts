import { describe, expect, it } from "vitest";
import { markerShape, toFeatureCollection, type MapPoint } from "./geojson";

const pt = (o: Partial<MapPoint> = {}): MapPoint => ({
  slug: "a-trail", name: "A trail", place: "Wayanad, Kerala", lon: 76.1, lat: 11.6, accessClass: "public", ...o,
});

describe("markerShape", () => {
  it.each([
    ["public", "circle"], ["permission_required", "triangle"], ["restricted", "square"],
    ["private_no_access", "square"], ["unknown", "open-circle"],
  ] as const)("%s -> %s", (access, shape) => {
    expect(markerShape(access)).toBe(shape);
  });
});

describe("toFeatureCollection", () => {
  it("builds point features with longitude first and the details the card needs", () => {
    const fc = toFeatureCollection([pt()]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0]).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [76.1, 11.6] },
      properties: { slug: "a-trail", name: "A trail", place: "Wayanad, Kerala", shape: "circle", access: "Publicly accessible" },
    });
  });
  it("skips trails without a public location", () => {
    expect(toFeatureCollection([pt({ lon: null, lat: null }), pt({ slug: "b" })]).features.map((f) => f.properties.slug)).toEqual(["b"]);
  });
  it("skips non-finite or out-of-range coordinates", () => {
    expect(toFeatureCollection([pt({ lon: Number.NaN }), pt({ lat: 200 }), pt({ lon: 500 })]).features).toHaveLength(0);
  });
  it("is empty for no points", () => {
    expect(toFeatureCollection([]).features).toEqual([]);
  });
});
