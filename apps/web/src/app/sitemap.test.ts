import { describe, expect, it } from "vitest";
import { buildRobots, buildSitemap } from "./sitemap-data";

const site = "https://moto-trails.com";
const entries = {
  trails: [{ slug: "a-trail", updatedAt: "2026-03-01T00:00:00.000Z" }],
  regions: [{ path: "/regions/kerala" }, { path: "/regions/kerala/wayanad" }],
};

describe("buildSitemap", () => {
  it("lists home, the regions hub, indexable regions and trails with absolute URLs", () => {
    const urls = buildSitemap(entries, site).map((e) => e.url);
    expect(urls).toEqual([
      "https://moto-trails.com",
      "https://moto-trails.com/trails",
      "https://moto-trails.com/regions",
      "https://moto-trails.com/regions/kerala",
      "https://moto-trails.com/regions/kerala/wayanad",
      "https://moto-trails.com/trails/a-trail",
    ]);
  });
  it("sets lastModified for trails", () => {
    const trail = buildSitemap(entries, site).find((e) => e.url.endsWith("/trails/a-trail"))!;
    expect(trail.lastModified).toEqual(new Date("2026-03-01T00:00:00.000Z"));
  });
  it("lists nothing under /design or /api", () => {
    expect(buildSitemap(entries, site).some((e) => e.url.includes("/design") || e.url.includes("/api"))).toBe(false);
  });
});

describe("buildRobots", () => {
  it("allows everything except design and api and points at the sitemap", () => {
    expect(buildRobots(site)).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/design", "/api/"] },
      sitemap: "https://moto-trails.com/sitemap.xml",
    });
  });
});
