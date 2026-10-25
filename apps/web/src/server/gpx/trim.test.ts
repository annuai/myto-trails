// @vitest-environment node
import { describe, expect, it } from "vitest";
import { trimTrack } from "./trim";

// A straight line north along a meridian: 0.01 degrees of latitude is about 1.112 km.
const line = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: 12 + i * 0.001, lon: 77, ele: 800 + i }));

describe("trimTrack", () => {
  it("removes the first and last stretch by distance, keeping the middle", () => {
    const pts = line(101); // about 11.1 km
    const out = trimTrack(pts, { startKm: 2, endKm: 2 });
    expect(out[0]!.lat).toBeGreaterThanOrEqual(12 + 0.018);
    expect(out[out.length - 1]!.lat).toBeLessThanOrEqual(12 + 0.1 - 0.018 + 1e-9);
    expect(out.length).toBeGreaterThan(40);
    expect(out.length).toBeLessThan(70);
  });

  it("keeps the track whole when nothing is asked to be trimmed", () => {
    expect(trimTrack(line(20), { startKm: 0, endKm: 0 })).toHaveLength(20);
  });

  it("refuses to trim away the whole track", () => {
    expect(() => trimTrack(line(20), { startKm: 1.2, endKm: 1.2 })).toThrow(/nothing left/i);
  });

  it("keeps elevation and never mutates the input", () => {
    const pts = line(50);
    const copy = JSON.stringify(pts);
    const out = trimTrack(pts, { startKm: 1, endKm: 1 });
    expect(out.every((p) => typeof p.ele === "number")).toBe(true);
    expect(JSON.stringify(pts)).toBe(copy);
  });
});
