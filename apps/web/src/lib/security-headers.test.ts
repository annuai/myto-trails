import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "./security-headers";

const directive = (csp: string, name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? "";

describe("buildCsp", () => {
  it("locks down framing, base, forms and objects", () => {
    const csp = buildCsp({ dev: false });
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
  });
  it("allows the map style host, workers and images, but no eval in production", () => {
    const csp = buildCsp({ dev: false, mapStyleUrl: "https://tiles.example.com/style.json" });
    expect(directive(csp, "connect-src")).toContain("https://tiles.example.com");
    expect(directive(csp, "worker-src")).toContain("blob:");
    expect(directive(csp, "img-src")).toContain("data:");
    expect(directive(csp, "script-src")).not.toContain("'unsafe-eval'");
  });
  it("allows OpenStreetMap tiles for the default basemap", () => {
    const csp = buildCsp({ dev: false });
    expect(directive(csp, "img-src")).toContain("https://tile.openstreetmap.org");
    expect(directive(csp, "connect-src")).toContain("https://tile.openstreetmap.org"); // MapLibre fetches tiles with fetch()
  });
  it("allows eval only while developing", () => {
    expect(directive(buildCsp({ dev: true }), "script-src")).toContain("'unsafe-eval'");
  });
  it("ignores a malformed map style url", () => {
    expect(() => buildCsp({ dev: false, mapStyleUrl: "not a url" })).not.toThrow();
  });
  it("allows the public image host when one is configured", () => {
    expect(directive(buildCsp({ dev: false, publicAssetBase: "https://cdn.example.com/public" }), "img-src")).toContain("https://cdn.example.com");
    expect(directive(buildCsp({ dev: false, publicAssetBase: "https://cdn.example.com/public" }), "media-src")).toEqual("media-src 'self' https://cdn.example.com");
    expect(directive(buildCsp({ dev: false }), "media-src")).toEqual("media-src 'self'");
  });
});

describe("securityHeaders", () => {
  it("sends HSTS only in production and always sends the basics", () => {
    const names = (prod: boolean) => securityHeaders({ dev: !prod, production: prod }).map((h) => h.key);
    expect(names(true)).toContain("Strict-Transport-Security");
    expect(names(false)).not.toContain("Strict-Transport-Security");
    for (const k of ["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) expect(names(true)).toContain(k);
  });
  it("lets the page use the visitor's location (near me) and nothing else sensitive", () => {
    const pp = securityHeaders({ dev: false, production: true }).find((h) => h.key === "Permissions-Policy")!.value;
    expect(pp).toContain("geolocation=(self)");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });
});
