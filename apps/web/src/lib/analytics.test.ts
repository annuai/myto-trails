import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";
import { analyticsConfig, scrubCapture, scrubUrl } from "./analytics";

const SITE = "https://myto.example";
const ev = (event: string, properties: Record<string, unknown>) => ({ uuid: "u", event, properties }) as unknown as CaptureResult;

describe("scrubUrl", () => {
  it("sends our own pages as route patterns without the query", () => {
    expect(scrubUrl(`${SITE}/track/abc?token=1#x`, SITE)).toBe(`${SITE}/track/[id]`);
    expect(scrubUrl("/join/CODE", SITE)).toBe("/join/[id]");
  });
  it("sends other sites as their origin only", () => {
    expect(scrubUrl("https://www.google.com/search?q=my+home", SITE)).toBe("https://www.google.com");
  });
  it("keeps a direct visit and drops anything else it cannot read", () => {
    expect(scrubUrl("$direct", SITE)).toBe("$direct");
    expect(scrubUrl("not a url", SITE)).toBe("");
  });
});

describe("scrubCapture", () => {
  it("drops events we did not choose", () => {
    expect(scrubCapture(ev("$autocapture", {}), SITE)).toBeNull();
    expect(scrubCapture(ev("$pageleave", {}), SITE)).toBeNull();
    expect(scrubCapture(ev("$exception", {}), SITE)).toBeNull();
  });
  it("rewrites every URL prop on a page view and turns off the location lookup", () => {
    const out = scrubCapture(ev("$pageview", { $current_url: `${SITE}/route/x?a=1`, $pathname: "/route/x", $referrer: "https://t.co/abc", $browser: "Chrome" }), SITE);
    expect(out?.properties).toEqual({ $current_url: `${SITE}/route/[id]`, $pathname: "/route/[id]", $referrer: "https://t.co", $browser: "Chrome", $geoip_disable: true });
  });
  it("keeps only the allowed props on our own events", () => {
    const out = scrubCapture(ev("trail_viewed", { trail: "spiti-loop", email: "a@b.co" }), SITE);
    expect(out?.properties).toEqual({ trail: "spiti-loop", $geoip_disable: true });
  });
  it("keeps the token and anonymous id the SDK needs to deliver the event", () => {
    const out = scrubCapture(ev("$pageview", { token: "phc_x", distinct_id: "anon-1", name: "Ravi" }), SITE);
    expect(out?.properties).toEqual({ token: "phc_x", distinct_id: "anon-1", $geoip_disable: true });
  });
  it("passes replay snapshots through", () => {
    const snap = ev("$snapshot", { $snapshot_data: [] });
    expect(scrubCapture(snap, SITE)).toBe(snap);
  });
});

describe("analyticsConfig", () => {
  it("uses no cookies or storage, no profiles and no autocapture, and masks replay", () => {
    const c = analyticsConfig(SITE);
    expect(c).toMatchObject({ api_host: "/ingest", persistence: "memory", person_profiles: "never", autocapture: false, capture_pageview: false, disable_session_recording: true });
    expect(c.session_recording).toMatchObject({ maskAllInputs: true, maskTextSelector: "[data-ph-mask]", recordHeaders: false, recordBody: false });
  });
});
