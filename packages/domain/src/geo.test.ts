import { describe, expect, it } from "vitest";
import { estimateTravel, haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 12.97, lon: 77.59 }, { lat: 12.97, lon: 77.59 })).toBe(0);
  });
  it("measures Bengaluru to Mysuru at roughly 125 km", () => {
    const km = haversineKm({ lat: 12.9716, lon: 77.5946 }, { lat: 12.2958, lon: 76.6394 });
    expect(km).toBeGreaterThan(123);
    expect(km).toBeLessThan(128);
  });
  it("is symmetric", () => {
    const a = { lat: 9.93, lon: 76.27 };
    const b = { lat: 11.25, lon: 75.78 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe("estimateTravel", () => {
  it("applies a 1.4 road factor at 40 km/h and doubles it for the round trip", () => {
    expect(estimateTravel(100)).toEqual({ oneWayMin: 210, roundTripMin: 420 });
  });
  it("rounds each way to the nearest 5 minutes", () => {
    expect(estimateTravel(62)).toEqual({ oneWayMin: 130, roundTripMin: 260 });
  });
  it("is zero at zero distance", () => {
    expect(estimateTravel(0)).toEqual({ oneWayMin: 0, roundTripMin: 0 });
  });
  it("rejects negative or non-finite distances", () => {
    expect(() => estimateTravel(-1)).toThrow(RangeError);
    expect(() => estimateTravel(Number.NaN)).toThrow(RangeError);
    expect(() => estimateTravel(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
  it("accepts a custom road factor and speed", () => {
    expect(estimateTravel(60, { roadFactor: 1, speedKmh: 60 })).toEqual({ oneWayMin: 60, roundTripMin: 120 });
  });
});
