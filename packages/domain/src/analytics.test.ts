import { describe, expect, it } from "vitest";
import { replayAllowed, screenPattern, scrubAnalyticsProps, webPagePattern } from "./analytics";

describe("scrubAnalyticsProps", () => {
  it("keeps only the props allowed for the event", () => {
    expect(scrubAnalyticsProps("ride_finished", { distanceKm: 42.4, durationMin: 61, lat: 12.97, rideId: "r1" })).toEqual({ distanceKm: 42, durationMin: 60 });
    expect(scrubAnalyticsProps("app_opened", { anything: "x" })).toEqual({});
  });
  it("rounds distance to a whole km and duration to the nearest 5 minutes", () => {
    expect(scrubAnalyticsProps("ride_finished", { distanceKm: 0.6, durationMin: 2 })).toEqual({ distanceKm: 1, durationMin: 0 });
    expect(scrubAnalyticsProps("ride_finished", { distanceKm: 99.5, durationMin: 118 })).toEqual({ distanceKm: 100, durationMin: 120 });
  });
  it("drops numbers that are not finite and values of the wrong type", () => {
    expect(scrubAnalyticsProps("ride_finished", { distanceKm: Number.NaN, durationMin: "60" })).toEqual({});
  });
  it("drops strings that look like an email, a coordinate, a token or free text", () => {
    expect(scrubAnalyticsProps("trail_viewed", { trail: "a@b.co" })).toEqual({});
    expect(scrubAnalyticsProps("trail_viewed", { trail: "12.97,77.59" })).toEqual({});
    expect(scrubAnalyticsProps("trail_viewed", { trail: "x".repeat(81) })).toEqual({});
    expect(scrubAnalyticsProps("trail_viewed", { trail: "great ride with Ravi" })).toEqual({});
    expect(scrubAnalyticsProps("trail_viewed", { trail: "spiti-loop" })).toEqual({ trail: "spiti-loop" });
  });
  it("keeps only the listed values for a choice", () => {
    expect(scrubAnalyticsProps("ride_started", { source: "gps" })).toEqual({ source: "gps" });
    expect(scrubAnalyticsProps("ride_started", { source: "spoofed" })).toEqual({});
  });
});

describe("webPagePattern", () => {
  it("replaces private ids and removes the query and hash", () => {
    expect(webPagePattern("/track/abc123?x=1#y")).toBe("/track/[id]");
    expect(webPagePattern("/route/9f8e")).toBe("/route/[id]");
    expect(webPagePattern("/join/ABCD")).toBe("/join/[id]");
    expect(webPagePattern("/account/contributions/9")).toBe("/account/contributions/[id]");
    expect(webPagePattern("/submit/77/route")).toBe("/submit/[id]/route");
    expect(webPagePattern("/riders/u-1")).toBe("/riders/[id]");
  });
  it("keeps public trail and region slugs", () => {
    expect(webPagePattern("/trails/spiti-loop")).toBe("/trails/spiti-loop");
    expect(webPagePattern("/trails/spiti-loop/download")).toBe("/trails/spiti-loop/download");
    expect(webPagePattern("/regions/in/karnataka")).toBe("/regions/in/karnataka");
  });
  it("keeps static pages as they are", () => {
    expect(webPagePattern("/")).toBe("/");
    expect(webPagePattern("/privacy/")).toBe("/privacy");
    expect(webPagePattern("/sign-in/check-email")).toBe("/sign-in/check-email");
  });
});

describe("screenPattern", () => {
  it("joins the route segments and leaves out route groups", () => {
    expect(screenPattern(["(tabs)", "trail", "[id]"])).toBe("/trail/[id]");
    expect(screenPattern([])).toBe("/");
  });
  it("never sends a real id, even when a segment is filled in", () => {
    expect(screenPattern(["rides", "8b1f0c2e-1234"])).toBe("/rides/[id]");
  });
});

describe("replayAllowed", () => {
  it("blocks pages with accounts, private links or contributions", () => {
    for (const p of ["/account", "/account/devices", "/sign-in", "/auth/app", "/moderate/users", "/track/x", "/route/x", "/join/x", "/submit", "/saved"]) expect(replayAllowed(p)).toBe(false);
  });
  it("allows public pages", () => {
    for (const p of ["/", "/trails/x", "/regions/in", "/about"]) expect(replayAllowed(p)).toBe(true);
  });
  it("does not mistake a similar prefix for a blocked one", () => {
    expect(replayAllowed("/accountability")).toBe(true);
  });
});
