import { describe, expect, it } from "vitest";
import { clientIp, getRequestOrigin, hashIp } from "./request-context";

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

describe("getRequestOrigin", () => {
  it("always uses the configured site URL in production", () => {
    expect(getRequestOrigin({ production: true, siteUrl: "https://moto-trails.com", host: "evil.example", proto: "http" })).toBe("https://moto-trails.com");
  });
  it("uses the request host in development", () => {
    expect(getRequestOrigin({ production: false, siteUrl: "http://localhost:3000", host: "localhost:3123", proto: null })).toBe("http://localhost:3123");
  });
  it("falls back to the site URL for a missing or suspicious host", () => {
    for (const host of [null, "", "a b", "evil.example/path", "x@y", "a.b:notaport"]) {
      expect(getRequestOrigin({ production: false, siteUrl: "http://localhost:3000", host, proto: "http" })).toBe("http://localhost:3000");
    }
  });
});

describe("clientIp and hashIp", () => {
  it("takes the first forwarded address, then x-real-ip, then unknown", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(headers({}))).toBe("unknown");
  });
  it("hashes addresses so the raw IP is never stored", () => {
    expect(hashIp("203.0.113.5")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("203.0.113.5")).toBe(hashIp("203.0.113.5"));
    expect(hashIp("203.0.113.5")).not.toContain("203.0.113.5");
    expect(hashIp("203.0.113.5")).not.toBe(hashIp("203.0.113.6"));
  });
});
