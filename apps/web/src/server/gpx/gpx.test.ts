// @vitest-environment node
import { describe, expect, it } from "vitest";
import { analyzeTrack, simplify } from "./analyze";
import { line, makeGpx } from "./fixtures";
import { parseGpx } from "./parse";
import { writeGpx } from "./write";

const parsedPoints = (xml: string) => {
  const r = parseGpx(xml);
  if (!r.ok) throw new Error(`parse failed: ${r.error}`);
  return r.tracks.flat();
};

describe("parseGpx", () => {
  it("reads track points with elevation and time, plus waypoints and the track name", () => {
    const xml = makeGpx(
      [{ lat: 11.6, lon: 76.1, ele: 100, time: Date.parse("2026-01-01T00:00:00Z") }, { lat: 11.601, lon: 76.1, ele: 105.5 }],
      '<wpt lat="11.6005" lon="76.1"><name>Gate</name></wpt>',
    );
    const r = parseGpx(xml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tracks).toHaveLength(1);
    expect(r.tracks[0]![0]).toEqual({ lat: 11.6, lon: 76.1, ele: 100, time: Date.parse("2026-01-01T00:00:00Z") });
    expect(r.tracks[0]![1]).toEqual({ lat: 11.601, lon: 76.1, ele: 105.5, time: undefined });
    expect(r.waypoints).toEqual([{ lat: 11.6005, lon: 76.1, name: "Gate" }]);
    expect(r.name).toBe("Test track");
  });

  it("reads several segments and falls back to route points when there is no track", () => {
    const two = `<gpx version="1.1"><trk><trkseg><trkpt lat="11.6" lon="76.1"/></trkseg><trkseg><trkpt lat="11.7" lon="76.1"/></trkseg></trk></gpx>`;
    const r = parseGpx(two);
    expect(r.ok && r.tracks).toHaveLength(2);
    const rte = `<gpx version="1.1"><rte><rtept lat="11.6" lon="76.1"/><rtept lat="11.7" lon="76.1"/></rte></gpx>`;
    const r2 = parseGpx(rte);
    expect(r2.ok && r2.tracks.flat()).toHaveLength(2);
  });

  it.each([
    ["an external entity (XXE)", '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><gpx version="1.1"><trk><name>&xxe;</name></trk></gpx>'],
    ["a billion-laughs entity bomb", '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]><gpx version="1.1"><trk><name>&lol2;</name></trk></gpx>'],
    ["a lower-case doctype", "<!doctype gpx><gpx version=\"1.1\"></gpx>"],
    ["an entity declaration without a doctype keyword spacing trick", "<!DOCTYPE\ngpx [<!ENTITY a 'b'>]><gpx/>"],
  ])("rejects %s", (_label, xml) => {
    expect(parseGpx(xml)).toEqual({ ok: false, error: "doctype_not_allowed" });
  });

  it.each([["", "not_gpx"], ["hello", "not_gpx"], ["\u0000\u0001\u0002binary", "not_gpx"], ["<html><body/></html>", "not_gpx"], ["<gpx", "not_gpx"], ['<?xml version="1.0"?><kml/>', "not_gpx"]])("rejects %j", (xml, error) => {
    expect(parseGpx(xml)).toEqual({ ok: false, error });
  });

  it("reports no track points for an empty track", () => {
    expect(parseGpx('<gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>')).toEqual({ ok: false, error: "no_track_points" });
  });

  it("says the data is corrupt, not empty, when every point is off the Earth", () => {
    expect(parseGpx('<gpx version="1.1"><trk><trkseg><trkpt lat="95" lon="10"/><trkpt lat="12" lon="400"/></trkseg></trk></gpx>')).toEqual({ ok: false, error: "invalid_coordinates" });
  });

  it("drops points with missing, non-numeric, infinite or out-of-range coordinates", () => {
    const xml = `<gpx version="1.1"><trk><trkseg>
      <trkpt lat="11.6" lon="76.1"/><trkpt lat="abc" lon="76.1"/><trkpt lat="Infinity" lon="76.1"/><trkpt lat="NaN" lon="76.1"/>
      <trkpt lat="91" lon="76.1"/><trkpt lat="11.6" lon="181"/><trkpt lon="76.1"/><trkpt lat="11.7" lon="76.1"/></trkseg></trk></gpx>`;
    expect(parsedPoints(xml)).toEqual([
      { lat: 11.6, lon: 76.1, ele: undefined, time: undefined },
      { lat: 11.7, lon: 76.1, ele: undefined, time: undefined },
    ]);
  });

  it("ignores non-numeric elevations and unparsable times", () => {
    const xml = '<gpx version="1.1"><trk><trkseg><trkpt lat="11.6" lon="76.1"><ele>high</ele><time>yesterday</time></trkpt></trkseg></trk></gpx>';
    expect(parsedPoints(xml)[0]).toEqual({ lat: 11.6, lon: 76.1, ele: undefined, time: undefined });
  });

  it("copes with absurdly deep nesting without throwing", () => {
    const deep = `<gpx version="1.1">${"<a>".repeat(20000)}${"</a>".repeat(20000)}</gpx>`;
    expect(() => parseGpx(deep)).not.toThrow();
  });

  it("does not expand entities in text", () => {
    const xml = '<gpx version="1.1"><trk><name>a &amp; b &lt;script&gt;</name><trkseg><trkpt lat="11.6" lon="76.1"/></trkseg></trk></gpx>';
    const r = parseGpx(xml);
    expect(r.ok && r.name).toContain("script");
  });
});

describe("analyzeTrack", () => {
  const ok = (points = line(100)) => {
    const r = analyzeTrack([points]);
    if (!r.ok) throw new Error(`analysis failed: ${r.error}`);
    return r.analysis;
  };

  it("measures the distance of a straight track", () => {
    const a = ok(line(101)); // 100 steps of 0.001 degrees = about 11.1 km
    expect(a.distanceKm).toBeGreaterThan(11.0);
    expect(a.distanceKm).toBeLessThan(11.2);
    expect(a.pointCount).toBe(101);
    expect(a.start).toEqual({ lat: 11.6, lon: 76.1 });
    expect(a.bounds).toMatchObject({ minLat: 11.6, maxLat: expect.closeTo(11.7, 6), minLon: 76.1, maxLon: 76.1 });
  });

  it("removes consecutive duplicate points", () => {
    const pts = line(60).flatMap((p) => [p, p]);
    expect(ok(pts).pointCount).toBe(60);
  });

  it("computes elevation gain and loss from smoothed elevations", () => {
    const climbThenDrop = line(120, undefined, { ele: (i) => (i < 60 ? 100 + i * 2 : 220 - (i - 60) * 1) });
    const a = ok(climbThenDrop);
    expect(a.elevation).not.toBeNull();
    expect(a.elevation!.gainM).toBeGreaterThan(105);
    expect(a.elevation!.gainM).toBeLessThan(125);
    expect(a.elevation!.lossM).toBeGreaterThan(50);
    expect(a.elevation!.lossM).toBeLessThan(65);
    expect(a.elevation!.minM).toBeCloseTo(100, 0);
    expect(a.elevation!.maxM).toBeGreaterThan(215);
  });

  it("ignores GPS elevation jitter below the threshold", () => {
    const flat = line(200, undefined, { ele: (i) => 500 + (i % 2 === 0 ? 1 : -1) });
    expect(ok(flat).elevation!.gainM).toBeLessThan(5);
  });

  it("has no elevation when fewer than 80% of points carry it", () => {
    const some = line(100, undefined, { ele: (i) => (i < 50 ? 100 : undefined) });
    expect(ok(some).elevation).toBeNull();
    expect(ok(line(100)).elevation).toBeNull();
  });

  it("derives moving time and speed from timestamps", () => {
    const t0 = Date.parse("2026-01-01T00:00:00Z");
    const timed = line(100, undefined, { time: (i) => t0 + i * 10_000 }); // 111 m per 10 s = 40 km/h
    const a = ok(timed);
    expect(a.timing).not.toBeNull();
    expect(a.timing!.movingSeconds).toBeGreaterThan(980);
    expect(a.timing!.avgMovingSpeedKmh).toBeGreaterThan(38);
    expect(a.timing!.avgMovingSpeedKmh).toBeLessThan(42);
  });

  it("rejects a track with too few points", () => {
    expect(analyzeTrack([line(1)])).toEqual({ ok: false, error: "too_few_points", message: "Only 1 track point found; a trail needs at least 50 points or 500 m." });
    expect(analyzeTrack([line(4)])).toMatchObject({ ok: false, error: "too_few_points" }); // 4 points, 333 m
  });

  it("accepts a short track if it is long enough in distance", () => {
    expect(analyzeTrack([line(10, undefined, { step: 0.01 })]).ok).toBe(true); // 10 points but 11 km
  });

  it("rejects positions that are not on Earth, with a message", () => {
    expect(analyzeTrack([line(100, { lat: 95, lon: 10 })])).toMatchObject({ ok: false, error: "invalid_coordinates" });
  });

  it("accepts a track anywhere on Earth", () => {
    expect(analyzeTrack([line(100, { lat: 51.5, lon: -0.12 })]).ok).toBe(true);
  });

  it("rejects teleports between points", () => {
    const jump = [...line(50), ...line(50, { lat: 18.6, lon: 76.1 })]; // about 780 km gap
    expect(analyzeTrack([jump])).toMatchObject({ ok: false, error: "teleport" });
  });

  it("rejects impossible speeds when timestamps are present", () => {
    const t0 = Date.parse("2026-01-01T00:00:00Z");
    const fast = line(100, undefined, { time: (i) => t0 + i * 1000 }); // 111 m per second = 400 km/h
    expect(analyzeTrack([fast])).toMatchObject({ ok: false, error: "teleport" });
  });

  it("rejects tracks longer than 500 km", () => {
    const long = line(600, { lat: 8.0, lon: 77.0 }, { step: 0.0095 }); // about 630 km without a single big jump
    expect(analyzeTrack([long])).toMatchObject({ ok: false, error: "too_long" });
  });

  it("joins several segments into one line", () => {
    const a = line(60);
    const b = line(60, { lat: 11.661, lon: 76.1 });
    expect(analyzeTrack([a, b]).ok).toBe(true);
  });

  it("produces a stable fingerprint and a simplified line", () => {
    const x = ok(line(1000));
    const y = ok(line(1000));
    expect(x.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(x.fingerprint).toBe(y.fingerprint);
    expect(x.simplified.length).toBeLessThanOrEqual(3); // a straight line collapses
    expect(x.simplified[0]).toEqual({ lat: 11.6, lon: 76.1 });
  });

  it("samples at most 300 profile points, from 0 to the total distance, when elevation exists", () => {
    const a = ok(line(2000, undefined, { ele: (i) => 100 + Math.sin(i / 50) * 50 }));
    expect(a.profile!.length).toBeLessThanOrEqual(300);
    expect(a.profile![0]!.d).toBe(0);
    expect(a.profile!.at(-1)!.d).toBeCloseTo(a.distanceKm, 1);
    for (let i = 1; i < a.profile!.length; i++) expect(a.profile![i]!.d).toBeGreaterThan(a.profile![i - 1]!.d);
    expect(ok(line(100)).profile).toBeNull();
  });

  it("handles 100,000 points quickly", () => {
    const started = Date.now();
    const big = line(100_000, { lat: 8.0, lon: 77.0 }, { step: 0.00004 }); // about 440 km in 4.4 m steps
    const a = ok(big);
    expect(a.pointCount).toBe(100_000);
    expect(a.simplified.length).toBeLessThan(20);
    expect(Date.now() - started).toBeLessThan(4000);
  });
});

describe("simplify", () => {
  it("keeps a zigzag and collapses a straight line", () => {
    const zig = Array.from({ length: 50 }, (_, i) => ({ lat: 11.6 + i * 0.001, lon: 76.1 + (i % 2 === 0 ? 0 : 0.002) }));
    expect(simplify(zig, 5).length).toBeGreaterThan(40);
    const straight = Array.from({ length: 50 }, (_, i) => ({ lat: 11.6 + i * 0.001, lon: 76.1 }));
    expect(simplify(straight, 5)).toHaveLength(2);
  });
  it("returns short inputs unchanged", () => {
    expect(simplify([{ lat: 1, lon: 1 }], 5)).toHaveLength(1);
    expect(simplify([], 5)).toEqual([]);
  });
});

describe("writeGpx", () => {
  const pts = [{ lat: 11.6000049, lon: 76.1000049, ele: 100.04 }, { lat: 11.601, lon: 76.1, ele: 101 }];

  it("writes plain GPX 1.1 that parses back, with coordinates rounded to 5 decimals", () => {
    const xml = writeGpx({ name: "Ridge", points: pts, waypoints: [{ lat: 11.6005, lon: 76.1, name: "Gate" }] });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<gpx version="1.1"');
    expect(xml).not.toContain("<extensions");
    expect(xml).toContain('lat="11.6" lon="76.1"');
    expect(xml).toContain("<ele>100</ele>");
    const r = parseGpx(xml);
    expect(r.ok && r.tracks[0]).toHaveLength(2);
    expect(r.ok && r.waypoints[0]!.name).toBe("Gate");
  });

  it("escapes markup in names, descriptions and links", () => {
    const evil = `</name><script>alert(1)</script> & "q" 'a'`;
    const xml = writeGpx({ name: evil, description: evil, link: "https://moto-trails.com/trails/x?a=1&b=2", points: pts, waypoints: [{ lat: 11.6, lon: 76.1, name: evil }] });
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("&amp;b=2");
    expect(parseGpx(xml).ok).toBe(true);
  });

  it("strips control characters that XML cannot carry", () => {
    const xml = writeGpx({ name: "a\u0000b\u0007c", points: pts, waypoints: [] });
        expect(xml).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
    expect(xml).toContain("abc");
  });

  it("includes metadata fields in standard elements", () => {
    const xml = writeGpx({ name: "Ridge", description: "Access: public", copyright: "Moto Trails contributors", link: "https://moto-trails.com/trails/x", points: pts, waypoints: [] });
    expect(xml).toContain("<metadata>");
    expect(xml).toContain("<desc>Access: public</desc>");
    expect(xml).toContain("<copyright");
    expect(xml).toContain('<link href="https://moto-trails.com/trails/x"');
  });
});

describe("analyzeTrack: hostile and degenerate input (M4 review)", () => {
  it("finishes a worst-case zigzag quickly instead of blocking on simplification", () => {
    const pts = Array.from({ length: 35_000 }, (_, i) => ({ lat: 11 + i * 0.00001, lon: 76 + (i % 2 === 0 ? 0 : 0.00006) }));
    const t0 = performance.now();
    const r = analyzeTrack([pts]);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(r.ok).toBe(true);
  });

  it("rejects more than 100,000 points with a clear message instead of throwing", () => {
    const pts = Array.from({ length: 150_000 }, (_, i) => ({ lat: 11 + i * 0.000001, lon: 76, ele: 100 }));
    const r = analyzeTrack([pts]);
    expect(r).toMatchObject({ ok: false, error: "too_many_points" });
  });

  it("rejects 50 points that are all within a few metres (a stationary recording)", () => {
    const pts = Array.from({ length: 60 }, (_, i) => ({ lat: 11 + i * 0.0000001, lon: 76 }));
    expect(analyzeTrack([pts])).toMatchObject({ ok: false, error: "too_few_points" });
  });

  it("ignores impossible elevations instead of overflowing", () => {
    const pts = line(120, undefined, { ele: (i) => (i === 10 ? 1e12 : 500 + i) });
    const r = analyzeTrack([pts]);
    expect(r.ok && r.analysis.elevation!.maxM).toBeLessThanOrEqual(9000);
    expect(r.ok && r.analysis.elevation!.gainM).toBeLessThan(1000);
  });
});
