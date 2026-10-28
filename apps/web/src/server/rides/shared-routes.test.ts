// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isPublicId, MAX_POINTS, MAX_WAYPOINTS, newPublicId, parseSharedRoute, sharedRouteGpx } from "./shared-routes";

const pts = (n: number) => Array.from({ length: n }, (_, i) => [12 + i * 0.0001, 77 + i * 0.0001]);
const body = (over: Record<string, unknown> = {}) => ({ name: "Nandi loop", points: pts(5), distanceKm: 37.04, ...over });

describe("shared route input", () => {
  it("rounds coordinates to 5 decimals and distance to 0.1 km", () => {
    const r = parseSharedRoute(body({ points: [[12.1234567, 77.7654321], [12.2, 77.8]] }))!;
    expect(r.points[0]).toEqual([12.12346, 77.76543]);
    expect(r.distanceKm).toBe(37);
  });

  it("strips web addresses from names instead of refusing the route", () => {
    expect(parseSharedRoute(body({ name: "Best loop www.spam.com ever" }))!.name).toBe("Best loop ever");
    expect(parseSharedRoute(body({ name: "https://spam.com" }))!.name).toBe("Shared route");
    expect(parseSharedRoute(body({ waypoints: [{ name: "Fuel visit.me/x", lat: 12, lng: 77 }] }))!.waypoints[0]!.name).not.toContain("visit.me");
  });

  it("accepts 2 to 2000 points and no more or fewer", () => {
    expect(parseSharedRoute(body({ points: pts(1) }))).toBeNull();
    expect(parseSharedRoute(body({ points: pts(2) }))).not.toBeNull();
    expect(parseSharedRoute(body({ points: pts(MAX_POINTS) }))).not.toBeNull();
    expect(parseSharedRoute(body({ points: pts(MAX_POINTS + 1) }))).toBeNull();
  });

  it("limits waypoints to 50", () => {
    const wps = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `W${i}`, lat: 12, lng: 77 }));
    expect(parseSharedRoute(body({ waypoints: wps(MAX_WAYPOINTS) }))!.waypoints).toHaveLength(MAX_WAYPOINTS);
    expect(parseSharedRoute(body({ waypoints: wps(MAX_WAYPOINTS + 1) }))).toBeNull();
  });

  it.each([
    ["a point out of range", { points: [[95, 10], [12, 77]] }],
    ["a point that is not a pair", { points: [[12], [12, 77]] }],
    ["a non-number coordinate", { points: [["12", 77], [12, 77]] }],
    ["a negative distance", { distanceKm: -1 }],
    ["no distance", { distanceKm: undefined }],
    ["an absurd climb", { elevationGainM: 99999 }],
    ["a waypoint out of range", { waypoints: [{ name: "x", lat: 12, lng: 200 }] }],
  ])("refuses %s", (_n, over) => {
    expect(parseSharedRoute(body(over))).toBeNull();
  });

  it("treats the climb as optional", () => {
    expect(parseSharedRoute(body())!.elevationGainM).toBeNull();
    expect(parseSharedRoute(body({ elevationGainM: 412.6 }))!.elevationGainM).toBe(413);
  });
});

describe("shared route ids and GPX", () => {
  it("makes ten-character ids that pass the check", () => {
    for (let i = 0; i < 100; i++) expect(isPublicId(newPublicId())).toBe(true);
    expect(isPublicId("short")).toBe(false);
    expect(isPublicId("ABCDEFGHJK")).toBe(false);
  });

  it("writes GPX with the route and waypoints, escaping text", () => {
    const r = parseSharedRoute(body({ name: "A & B <loop>", waypoints: [{ name: "Fuel", lat: 12.5, lng: 77.5 }] }))!;
    const xml = sharedRouteGpx(r, "https://x.test/route/abc");
    expect(xml).toContain("A &amp; B &lt;loop&gt;");
    expect(xml).toContain('<wpt lat="12.5" lon="77.5">');
    expect(xml.match(/<trkpt /g)).toHaveLength(5);
  });
});
