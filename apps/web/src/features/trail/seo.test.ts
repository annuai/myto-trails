import { describe, expect, it } from "vitest";
import { serializeJsonLd, trailJsonLd, trailMetadata } from "./seo";
import { makeTrail } from "./test-trail";

const site = "https://moto-trails.com";

describe("trailMetadata", () => {
  it("titles the page with place and sets the canonical URL", () => {
    const m = trailMetadata(makeTrail(), site);
    expect(m.title).toBe("Sample Wayanad ridge track · Wayanad, Kerala");
    expect(m.alternates?.canonical).toBe("https://moto-trails.com/trails/sample-wayanad-ridge-track");
    expect(m.openGraph).toMatchObject({ url: "https://moto-trails.com/trails/sample-wayanad-ridge-track", siteName: "Moto Trails", type: "article" });
  });
  it("omits the district from the title when there is none", () => {
    expect(trailMetadata(makeTrail({ district: null }), site).title).toBe("Sample Wayanad ridge track · Kerala");
  });
  it("keeps the description to 160 characters, cut at a word boundary", () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const d = trailMetadata(makeTrail({ summary: long }), site).description ?? "";
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
    expect(d.slice(0, -1).split(" ").every((w) => /^word\d+$/.test(w))).toBe(true);
  });
  it("leaves a short description untouched", () => {
    expect(trailMetadata(makeTrail({ summary: "Short and useful summary of the trail." }), site).description).toBe("Short and useful summary of the trail.");
  });
  it("keeps sample trails out of search results but not real ones", () => {
    expect(trailMetadata(makeTrail({ isSample: true }), site).robots).toEqual({ index: false, follow: true });
    expect(trailMetadata(makeTrail({ isSample: false }), site).robots).toBeUndefined();
  });
});

describe("trailJsonLd", () => {
  type Node = Record<string, unknown> & { itemListElement?: { name: string }[] };
  type Graph = { "@graph": Node[] };
  it("describes the trail as a Place in its country with breadcrumbs", () => {
    const ld = trailJsonLd(makeTrail(), site) as Graph;
    const place = ld["@graph"].find((n) => n["@type"] === "Place")!;
    expect(place).toMatchObject({
      name: "Sample Wayanad ridge track",
      url: "https://moto-trails.com/trails/sample-wayanad-ridge-track",
      address: { addressLocality: "Sampletown", addressRegion: "Kerala", addressCountry: "IN" },
      geo: { "@type": "GeoCoordinates", latitude: 11.62, longitude: 76.1 },
    });
    const crumbs = ld["@graph"].find((n) => n["@type"] === "BreadcrumbList")!;
    expect(crumbs.itemListElement!.map((c) => c.name)).toEqual(["Home", "Regions", "Kerala", "Wayanad", "Sample Wayanad ridge track"]);
  });
  it("omits geo when the trail has no public location", () => {
    const ld = trailJsonLd(makeTrail({ location: null }), site) as Graph;
    expect(ld["@graph"].find((n) => n["@type"] === "Place")).not.toHaveProperty("geo");
  });
  it("uses only the approximate public point for a sensitive trail", () => {
    const ld = trailJsonLd(makeTrail({ sensitivity: "sensitive", location: { lon: 75, lat: 13.5 } }), site);
    const json = JSON.stringify(ld);
    expect(json).toContain("13.5");
    expect(json).not.toContain("75.123456");
  });
});

describe("serializeJsonLd", () => {
  it("never emits a literal closing script tag and round-trips", () => {
    const evil = makeTrail({ name: "</script><script>alert(1)</script>" });
    const ld = trailJsonLd(evil, site);
    const text = serializeJsonLd(ld);
    expect(text).not.toContain("</script>");
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(ld)));
  });
});
