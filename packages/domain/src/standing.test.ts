import { describe, expect, it } from "vitest";
import { MIN_COHORT, bandOf, cellOf, parseStandingMetric, percentileBelow } from "./standing";

const row = (n: number) => ({ n, deciles: [10, 20, 30, 40, 50, 60, 70, 80, 90] });

describe("percentileBelow", () => {
  it("is null for a cohort under MIN_COHORT", () => {
    expect(MIN_COHORT).toBe(20);
    expect(percentileBelow(50, row(19))).toBeNull();
    expect(typeof percentileBelow(50, row(20))).toBe("number");
  });
  it("counts a value equal to a decile as at or below it", () => {
    expect(percentileBelow(30, row(20))).toBe(30);
    expect(percentileBelow(90, row(20))).toBe(90);
  });
  it("interpolates between deciles", () => {
    expect(percentileBelow(35, row(20))).toBe(35);
    expect(percentileBelow(85, row(20))).toBe(85);
  });
  it("caps below the first decile at 10 and gives 100 above the last", () => {
    expect(percentileBelow(5, row(20))).toBeLessThanOrEqual(10);
    expect(percentileBelow(-3, row(20))).toBeLessThanOrEqual(10);
    expect(percentileBelow(91, row(20))).toBe(100);
  });
  it("handles flat deciles (ties) without dividing by zero", () => {
    const flat = { n: 30, deciles: [0, 0, 0, 5, 5, 5, 9, 9, 9] };
    expect(percentileBelow(0, flat)).toBe(30);
    expect(percentileBelow(5, flat)).toBe(60);
    expect(percentileBelow(7, flat)).toBe(65);
    expect(percentileBelow(100, flat)).toBe(100);
  });
  it("is null unless n is a finite number >= MIN_COHORT", () => {
    const d = row(20).deciles;
    for (const n of [undefined, NaN, 19, Infinity * 0]) {
      expect(percentileBelow(50, { n: n as number, deciles: d })).toBeNull();
    }
    expect(percentileBelow(50, { n: 20, deciles: d })).not.toBeNull();
  });
  it("is null for a NaN value or a NaN decile", () => {
    expect(percentileBelow(NaN, row(20))).toBeNull();
    expect(percentileBelow(Infinity, row(20))).toBeNull();
    const bad = { n: 20, deciles: [10, 20, NaN, 40, 50, 60, 70, 80, 90] };
    expect(percentileBelow(50, bad)).toBeNull();
  });
  it("gives 10 for a value exactly at decile 1", () => {
    expect(percentileBelow(10, row(20))).toBe(10);
  });
  it("is null for a malformed decile table", () => {
    expect(percentileBelow(1, { n: 50, deciles: [1, 2] })).toBeNull();
  });
});

describe("parseStandingMetric", () => {
  it("accepts the whitelist", () => {
    expect(parseStandingMetric("distance_km")).toEqual({ ok: true, metric: "distance_km" });
    expect(parseStandingMetric("rides")).toEqual({ ok: true, metric: "rides" });
  });
  it("refuses speed-like metrics", () => {
    for (const m of ["top_speed", "speed", "fast", "pace", "lap_time", "streak"]) {
      expect(parseStandingMetric(m)).toEqual({ ok: false, reason: "refused" });
    }
  });
  it("matches whole tokens only", () => {
    expect(parseStandingMetric("workspace")).toEqual({ ok: false, reason: "unknown" });
    expect(parseStandingMetric("overlap")).toEqual({ ok: false, reason: "unknown" });
    for (const m of ["speed", "top_speed", "fast", "pace", "lap", "streak"]) {
      expect(parseStandingMetric(m)).toEqual({ ok: false, reason: "refused" });
    }
  });
  it("calls anything else unknown", () => {
    expect(parseStandingMetric("karma")).toEqual({ ok: false, reason: "unknown" });
    expect(parseStandingMetric(7)).toEqual({ ok: false, reason: "unknown" });
  });
});

describe("cellOf", () => {
  it("floors to a 1 degree cell", () => {
    expect(cellOf(11.4, 76.2)).toBe("11:76");
    expect(cellOf(-0.5, -0.5)).toBe("-1:-1");
  });
});

describe("bandOf", () => {
  it("labels bands and never goes negative", () => {
    expect(bandOf(95)).toBe("top 10%");
    expect(bandOf(90)).toBe("top 10%");
    expect(bandOf(89)).toBe("top 25%");
    expect(bandOf(80)).toBe("top 25%");
    expect(bandOf(75)).toBe("top 25%");
    expect(bandOf(74)).toBe("top half");
    expect(bandOf(50)).toBe("top half");
    expect(bandOf(49)).toBe("riding along");
    expect(bandOf(60)).toBe("top half");
    expect(bandOf(10)).toBe("riding along");
    expect(bandOf(0)).toBe("riding along");
    expect(bandOf(-5)).toBe("riding along");
  });
});
