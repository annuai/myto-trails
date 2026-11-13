import { describe, expect, it } from "vitest";
import { scrubCrashEvent, scrubText } from "./crashScrub";

describe("scrubText", () => {
  it("removes emails, tokens, coordinate pairs and secret query values", () => {
    expect(scrubText("mail a.b+c@x.co.in now")).toBe("mail [email] now");
    expect(scrubText("Authorization: Bearer abcdef123456.xyz")).toBe("Authorization: Bearer [token]");
    expect(scrubText("at 12.971599, 77.594566 stopped")).toBe("at [location] stopped");
    expect(scrubText("GET /x?token=abc123&page=2")).toBe("GET /x?token=[removed]&page=2");
  });
  it("leaves ordinary text and short numbers alone", () => {
    expect(scrubText("Cannot read property 'x' of undefined at line 12.5")).toBe("Cannot read property 'x' of undefined at line 12.5");
  });
});

describe("scrubCrashEvent", () => {
  const event = {
    event_id: "1",
    release: "0.11.0",
    user: { id: "u", email: "a@b.co", ip_address: "1.2.3.4" },
    extra: { ride: [[12.9, 77.5]] },
    request: { url: "https://x.test/api/v1/rides?token=zzz", method: "POST", data: { lat: 1 }, headers: { authorization: "Bearer abcdefgh" }, cookies: "a=b" },
    breadcrumbs: [{ type: "http", category: "fetch", message: "tap Finish", data: { url: "https://x.test/?token=q", lat: 12.97 } }],
    exception: { values: [{ type: "Error", value: "failed for rider@x.in at 12.971599, 77.594566" }] },
  };
  it("drops user, extra and request payloads, keeps the error and release", () => {
    const out = scrubCrashEvent(event) as typeof event & Record<string, unknown>;
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.request).toEqual({ url: "https://x.test/api/v1/rides", method: "POST" });
    expect(out.breadcrumbs).toEqual([{ type: "http", category: "fetch", message: "tap Finish" }]);
    expect(out.exception.values[0]!.value).toBe("failed for [email] at [location]");
    expect(out.release).toBe("0.11.0");
  });
  it("does not change the original event", () => {
    scrubCrashEvent(event);
    expect(event.user.email).toBe("a@b.co");
  });
});
