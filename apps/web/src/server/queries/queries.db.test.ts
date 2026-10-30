import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "postgres";
import { seedRegions } from "../db/seed-regions";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { line, makeGpx } from "../gpx/fixtures";
import { searchTrails } from "./search.sql";
import { parseSearchParams } from "@/features/discovery/search-params";
import { querySitemapEntries, queryTrailBySlug, queryTrailMedia, queryTrailRoute, queryTrailVideos, queryTrailsInRegion } from "./trails.sql";
import { queryDistricts, queryRegionBySlugs, queryRegionsForHub, queryStates } from "./regions.sql";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-06-01T12:00:00Z");

beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});

const neverCalled = new Proxy({}, { get() { throw new Error("SQL must not be called"); }, apply() { throw new Error("SQL must not be called"); } }) as unknown as Sql;
const loc = (n: string) => ({ state: { slug: `qs-${n}`, name: `QS ${n}` }, district: { slug: `qd-${n}`, name: `QD ${n}` } });

describe("queryTrailBySlug", () => {
  it("returns a published trail with place names", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("a"), name: "Query trail A" });
    const dto = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now));
    expect(dto).toMatchObject({ slug: t.slug, name: "Query trail A", state: { slug: "qs-a", name: "QS a" }, district: { slug: "qd-a", name: "QD a" }, distanceKm: 24.1 });
  });

  it.each(["draft", "in_review", "unpublished", "archived"] as const)("returns null for a %s trail", async (lifecycle) => {
    const t = await insertTrailFixture(db.sql, { ...loc("b"), lifecycle });
    expect(await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now))).toBeNull();
  });

  it.each(["UPPER", "a/b", "a".repeat(200), "x'; drop table trail;--", "café", "", "a b", "-a"])("returns null without querying for %j", async (slug) => {
    expect(await queryTrailBySlug(neverCalled, slug, now)).toBeNull();
  });

  it("returns null for a valid but unknown slug", async () => {
    expect(await asAnon(db.sql, (tx) => queryTrailBySlug(tx, "no-such-trail", now))).toBeNull();
  });

  it("keeps the trail table intact after hostile input", async () => {
    const [row] = await db.sql`select count(*)::int as n from trail`;
    expect(row!.n).toBeGreaterThan(0);
  });

  it("shows a stale verification as needing a re-check within 30 days and unverified after", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("c"), verificationLevel: "moderator_verified", verifiedAt: "2025-06-01", validUntil: "2026-01-01" });
    const within = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, new Date("2026-01-20T00:00:00Z")));
    expect(within!.verification).toEqual({ level: "moderator_verified", needsRecheck: true });
    const after = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, new Date("2026-03-05T00:00:00Z")));
    expect(after!.verification).toEqual({ level: "unverified", needsRecheck: true });
    expect(after!.verifiedAt).toBe("2025-06-01");
  });

  it("falls back to unknown when a temporary closure is overdue", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("d"), conditionStatus: "temporarily_closed", expectedUntil: "2026-03-01", conditionReason: "landslide" });
    const dto = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now));
    expect(dto!.condition).toBe("unknown");
  });

  it("still returns a permanently closed trail", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("e"), conditionStatus: "permanently_closed" });
    const dto = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now));
    expect(dto!.condition).toBe("permanently_closed");
  });

  it("exposes only the approximate location of a sensitive trail", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("f"), sensitivity: "sensitive", startPoint: { lon: 75.123456, lat: 13.654321 }, publicPoint: { lon: 75.0, lat: 13.5 } });
    const dto = await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now));
    expect(dto!.location).toEqual({ lon: 75, lat: 13.5 });
    const json = JSON.stringify(dto);
    expect(json).not.toContain("75.123456");
    expect(json).not.toContain("13.654321");
  });

  it("has a null location for a sensitive trail without a public point", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("g"), sensitivity: "restricted_geometry" });
    expect((await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now)))!.location).toBeNull();
  });
});

describe("open closure reports on the trail DTO", () => {
  it("counts recent open closure reports and is zero otherwise", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("rp") });
    const [u] = await db.sql`insert into app_user (email, display_name) values ('rp@example.test', 'Rep') returning id`;
    expect((await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now)))!.openClosureReports).toBe(0);
    await db.sql`insert into trail_report (trail_id, reporter_id, type, details) values (${t.trailId}, ${u!.id}, 'closure', 'The gate was locked when I arrived on Saturday.')`;
    expect((await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now)))!.openClosureReports).toBe(1);
  });
});

describe("queryTrailMedia", () => {
  it("returns media in position order", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("h"), mediaCount: 3 });
    const media = await asAnon(db.sql, (tx) => queryTrailMedia(tx, t.slug));
    expect(media.map((m) => m.position)).toEqual([0, 1, 2]);
    expect(media[0]).toMatchObject({ role: "cover", altText: "Alt text 0" });
    expect(media[0]!.variants["800"]).toContain("https://example.test/");
  });
  it("returns an empty list for an invalid slug without querying", async () => {
    expect(await queryTrailMedia(neverCalled, "BAD SLUG")).toEqual([]);
  });
});

describe("regions", () => {
  it("lists trails of a state including its districts, ordered by name, without unpublished ones", async () => {
    const l = loc("i");
    await insertTrailFixture(db.sql, { ...l, name: "Zulu trail" });
    await insertTrailFixture(db.sql, { ...l, name: "Alpha trail" });
    await insertTrailFixture(db.sql, { ...l, name: "Hidden trail", lifecycle: "draft" });
    const rows = await asAnon(db.sql, (tx) => queryTrailsInRegion(tx, { countrySlug: "india", stateSlug: "qs-i" }, now));
    expect(rows.map((r) => r.name)).toEqual(["Alpha trail", "Zulu trail"]);
  });

  it("filters to one district", async () => {
    const a = loc("j");
    await insertTrailFixture(db.sql, { ...a });
    await insertTrailFixture(db.sql, { state: a.state, district: { slug: "other-d", name: "Other D" } });
    const rows = await asAnon(db.sql, (tx) => queryTrailsInRegion(tx, { countrySlug: "india", stateSlug: "qs-j", districtSlug: "qd-j" }, now));
    expect(rows).toHaveLength(1);
  });

  it("returns an empty list for invalid or unknown region slugs", async () => {
    expect(await queryTrailsInRegion(neverCalled, { countrySlug: "india", stateSlug: "Bad Slug" }, now)).toEqual([]);
    expect(await asAnon(db.sql, (tx) => queryTrailsInRegion(tx, { countrySlug: "india", stateSlug: "atlantis" }, now))).toEqual([]);
  });

  it("finds regions by slugs and rejects bad input", async () => {
    await insertTrailFixture(db.sql, { ...loc("k") });
    expect(await asAnon(db.sql, (tx) => queryRegionBySlugs(tx, "india", "qs-k"))).toMatchObject({ kind: "state", slug: "qs-k", publishedTrailCount: 1, countrySlug: "india", countryIso2: "IN" });
    expect(await asAnon(db.sql, (tx) => queryRegionBySlugs(tx, "india", "qs-k", "qd-k"))).toMatchObject({ kind: "district", parentSlug: "qs-k" });
    expect(await asAnon(db.sql, (tx) => queryRegionBySlugs(tx, "india", "qs-k", "nope"))).toBeNull();
    expect(await queryRegionBySlugs(neverCalled, "india", "UPPER")).toBeNull();
  });

  it("counts only published trails for states and districts", async () => {
    const l = loc("l");
    await insertTrailFixture(db.sql, { ...l });
    await insertTrailFixture(db.sql, { ...l });
    await insertTrailFixture(db.sql, { ...l, lifecycle: "draft" });
    const states = await asAnon(db.sql, (tx) => queryStates(tx));
    expect(states.find((s) => s.slug === "qs-l")!.publishedTrailCount).toBe(2);
    const districts = await asAnon(db.sql, (tx) => queryDistricts(tx, "india", "qs-l"));
    expect(districts).toHaveLength(1);
    expect(districts[0]).toMatchObject({ slug: "qd-l", publishedTrailCount: 2 });
  });

  it("hub list contains only states with at least one published trail", async () => {
    await insertTrailFixture(db.sql, { ...loc("m") });
    const hub = await asAnon(db.sql, (tx) => queryRegionsForHub(tx));
    expect(hub.some((s) => s.slug === "qs-m")).toBe(true);
    expect(hub.every((s) => s.publishedTrailCount >= 1)).toBe(true);
    expect(hub.some((s) => s.slug === "kerala")).toBe(false);
  });
});

describe("querySitemapEntries", () => {
  it("lists published trails and only regions with at least three published trails", async () => {
    const big = loc("n");
    const small = loc("o");
    const t1 = await insertTrailFixture(db.sql, { ...big });
    await insertTrailFixture(db.sql, { ...big });
    await insertTrailFixture(db.sql, { ...big });
    const t4 = await insertTrailFixture(db.sql, { ...small });
    const draft = await insertTrailFixture(db.sql, { ...big, lifecycle: "draft" });
    const entries = await asAnon(db.sql, (tx) => querySitemapEntries(tx, { excludeSample: true }));
    const slugs = entries.trails.map((t) => t.slug);
    expect(slugs).toContain(t1.slug);
    expect(slugs).toContain(t4.slug);
    expect(slugs).not.toContain(draft.slug);
    expect(entries.regions.map((r) => r.path)).toContain("/regions/india/qs-n");
    expect(entries.regions.map((r) => r.path)).toContain("/regions/india/qs-n/qd-n");
    expect(entries.regions.map((r) => r.path)).not.toContain("/regions/india/qs-o");
  });

  it("omits sample trails when asked", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("p"), isSample: true });
    const without = await asAnon(db.sql, (tx) => querySitemapEntries(tx, { excludeSample: true }));
    const withSamples = await asAnon(db.sql, (tx) => querySitemapEntries(tx, { excludeSample: false }));
    expect(without.trails.map((x) => x.slug)).not.toContain(t.slug);
    expect(withSamples.trails.map((x) => x.slug)).toContain(t.slug);
  });
});

describe("queryTrailRoute", () => {
  async function withRoute(overrides: Parameters<typeof insertTrailFixture>[1]) {
    const t = await insertTrailFixture(db.sql, overrides);
    const ingested = ingestGpx(new TextEncoder().encode(makeGpx(line(150, { lat: 10.1, lon: 77.0 }, { ele: (i) => 500 + i }))));
    if (!ingested.ok) throw new Error("fixture gpx");
    await db.sql.begin((tx) => insertRoute(tx, { ingested, revisionId: t.revisionId, userId: null, originalKey: `gpx/o/${t.slug}.gpx`, cleanKey: `gpx/o/${t.slug}-c.gpx`, sha256: "a".repeat(64), sizeBytes: 100 }));
    return t;
  }

  it("returns the simplified line, statistics and profile of a published standard trail, and marks hasGpx", async () => {
    const t = await withRoute({ ...loc("r1") });
    const route = await asAnon(db.sql, (tx) => queryTrailRoute(tx, t.slug));
    expect(route!.distanceKm).toBeGreaterThan(16);
    expect(route!.pointCount).toBe(150);
    expect(route!.line.length).toBeGreaterThanOrEqual(2);
    expect(route!.line[0]).toEqual([77, 10.1]);
    expect(route!.profile!.length).toBeGreaterThan(1);
    expect((await asAnon(db.sql, (tx) => queryTrailBySlug(tx, t.slug, now)))!.hasGpx).toBe(true);
  });

  it("returns null for sensitive and unpublished trails, trails without a route, and bad slugs", async () => {
    const sensitive = await withRoute({ ...loc("r2"), sensitivity: "sensitive", publicPoint: { lon: 77, lat: 10 } });
    const draft = await withRoute({ ...loc("r3"), lifecycle: "draft" });
    const none = await insertTrailFixture(db.sql, loc("r4"));
    for (const slug of [sensitive.slug, draft.slug, none.slug]) expect(await asAnon(db.sql, (tx) => queryTrailRoute(tx, slug))).toBeNull();
    expect(await queryTrailRoute(neverCalled, "BAD SLUG")).toBeNull();
  });
});

describe("cover photos on list queries", () => {
  it("attaches the cover to region and search results, and null when a trail has no photo", async () => {
    const withPhoto = await insertTrailFixture(db.sql, { ...loc("cv1"), name: "Cover photo trail", mediaCount: 2 });
    const without = await insertTrailFixture(db.sql, { ...loc("cv1"), name: "Cover less trail" });
    const region = await asAnon(db.sql, (tx) => queryTrailsInRegion(tx, { countrySlug: "india", stateSlug: "qs-cv1" }, now));
    expect(region.find((t) => t.slug === withPhoto.slug)!.cover).toMatchObject({ altText: "Alt text 0", variants: { "800": expect.stringContaining("https://example.test/") } });
    expect(region.find((t) => t.slug === without.slug)!.cover).toBeNull();
    const found = await asAnon(db.sql, (tx) => searchTrails(tx, parseSearchParams({ q: "Cover photo" }), now));
    expect(found.items[0]!.cover).not.toBeNull();
  });
  it("makes no query for an empty list", async () => {
    const { attachCovers } = await import("./trails.sql");
    expect(await attachCovers(neverCalled, [])).toEqual([]);
  });
});

describe("queryTrailVideos", () => {
  it("returns a published trail's videos in order, and nothing for a bad slug", async () => {
    const t = await insertTrailFixture(db.sql, { ...loc("vid1") });
    for (const [position, description] of [[1, "Second clip of the shore"], [0, "First clip of the shore"]] as const) {
      await db.sql`insert into trail_video (revision_id, position, description, mp4_url, poster_url, width, height, duration_s) values (${t.revisionId}, ${position}, ${description}, '/a.mp4', '/a.webp', 720, 1280, 9)`;
    }
    const videos = await asAnon(db.sql, (tx) => queryTrailVideos(tx, t.slug));
    expect(videos.map((v) => v.description)).toEqual(["First clip of the shore", "Second clip of the shore"]);
    expect(videos[0]).toMatchObject({ mp4Url: "/a.mp4", posterUrl: "/a.webp", width: 720, height: 1280, durationS: 9 });
    expect(await queryTrailVideos(neverCalled, "BAD SLUG")).toEqual([]);
  });
});
