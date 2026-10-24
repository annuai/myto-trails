import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSearchParams } from "@/features/discovery/search-params";
import { seedPlaces, type PlaceSeed } from "../db/seed-places";
import { seedRegions } from "../db/seed-regions";
import { insertTrailFixture, type TrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";
import { findPlace, searchMapPoints, searchTrails, suggest } from "./search.sql";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-06-01T12:00:00Z");
const places = JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/places.json", import.meta.url)), "utf8")) as PlaceSeed[];

beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
  await seedPlaces(db.sql, places);
});
afterAll(async () => {
  await db.drop();
});

const run = (query: Record<string, string | string[] | undefined>, point?: { lat: number; lon: number }) =>
  asAnon(db.sql, (tx) => searchTrails(tx, parseSearchParams(query), now, point ? { point } : undefined));
const loc = (n: string) => ({ state: { slug: `ss-${n}`, name: `SS ${n}` }, district: null });
const mk = (n: string, o: Partial<TrailFixture> = {}) => insertTrailFixture(db.sql, { ...loc(n), ...o });

describe("text search and filters", () => {
  it("finds trails by name and returns nothing for nonsense", async () => {
    await mk("t1", { name: "Quixotic ridge track" });
    expect((await run({ q: "quixotic" })).items.map((i) => i.name)).toContain("Quixotic ridge track");
    expect((await run({ q: "zzzzqqqq" })).items).toHaveLength(0);
  });

  it("filters by state, terrain, difficulty, access, suitability, month and length", async () => {
    const a = await mk("f", { terrain: ["mud", "gravel"], difficulty: "hard", accessClass: "permission_required", suitableFor: ["enduro"], bestMonths: [11, 12], distanceKm: 30 });
    const b = await mk("f", { terrain: ["sand"], difficulty: "easy", accessClass: "public", suitableFor: ["any"], bestMonths: [6], distanceKm: 8 });
    const slugs = async (q: Record<string, string>) => (await run({ state: "ss-f", ...q })).items.map((i) => i.slug).sort();
    expect(await slugs({})).toEqual([a.slug, b.slug].sort());
    expect(await slugs({ terrain: "mud" })).toEqual([a.slug]);
    expect(await slugs({ difficulty: "easy" })).toEqual([b.slug]);
    expect(await slugs({ access: "permission_required" })).toEqual([a.slug]);
    expect(await slugs({ suitable: "enduro" })).toEqual([a.slug]);
    expect(await slugs({ month: "6" })).toEqual([b.slug]);
    expect(await slugs({ minKm: "20" })).toEqual([a.slug]);
    expect(await slugs({ maxKm: "10" })).toEqual([b.slug]);
    expect(await slugs({ terrain: "mud,sand" })).toEqual([a.slug, b.slug].sort());
  });

  it("filters to current verification only", async () => {
    const ok = await mk("v", { verificationLevel: "moderator_verified", validUntil: "2099-01-01" });
    await mk("v", { verificationLevel: "community_reported", validUntil: null });
    expect((await run({ state: "ss-v", verified: "1" })).items.map((i) => i.slug)).toEqual([ok.slug]);
  });

  it("hides closed trails by default and shows them on request; an overdue closure is not closed", async () => {
    const open = await mk("c", {});
    const perm = await mk("c", { conditionStatus: "permanently_closed" });
    const temp = await mk("c", { conditionStatus: "temporarily_closed", expectedUntil: "2099-01-01" });
    const overdue = await mk("c", { conditionStatus: "temporarily_closed", expectedUntil: "2020-01-01" });
    const def = (await run({ state: "ss-c" })).items.map((i) => i.slug);
    expect(def).toContain(open.slug);
    expect(def).toContain(overdue.slug);
    expect(def).not.toContain(perm.slug);
    expect(def).not.toContain(temp.slug);
    const all = (await run({ state: "ss-c", closed: "1" })).items.map((i) => i.slug);
    expect(all).toEqual(expect.arrayContaining([open.slug, perm.slug, temp.slug, overdue.slug]));
  });

  it("never returns unpublished trails", async () => {
    const draft = await mk("u", { lifecycle: "draft", name: "Draftonly quokka" });
    expect((await run({ q: "quokka" })).items.map((i) => i.slug)).not.toContain(draft.slug);
  });
});

describe("near a place or a point", () => {
  // Bengaluru is at 12.9716, 77.5946. 0.18 degrees north is about 20 km.
  it("lists trails within the radius nearest first, with distance and a travel estimate", async () => {
    const near = await mk("n", { name: "Near Bengaluru A", startPoint: { lon: 77.5946, lat: 13.1516 } });
    const far = await mk("n", { name: "Far Mysuru B", startPoint: { lon: 76.6394, lat: 12.2958 } });
    const result = await run({ near: "bengaluru", state: "ss-n", radius: "150" });
    expect(result.items.map((i) => i.slug)).toEqual([near.slug, far.slug]);
    expect(result.items[0]!.distanceFromKm).toBeGreaterThan(18);
    expect(result.items[0]!.distanceFromKm).toBeLessThan(22);
    expect(result.items[1]!.distanceFromKm).toBeGreaterThan(125);
    expect(result.items[0]!.travel).toEqual({ oneWayMin: expect.any(Number), roundTripMin: expect.any(Number) });
    expect(result.items[0]!.travel!.roundTripMin).toBe(result.items[0]!.travel!.oneWayMin * 2);
    expect(result.origin).toMatchObject({ kind: "place" });
  });

  it("respects a smaller radius", async () => {
    await mk("r", { startPoint: { lon: 77.5946, lat: 13.1516 } });
    await mk("r", { startPoint: { lon: 76.6394, lat: 12.2958 } });
    expect((await run({ near: "bengaluru", state: "ss-r", radius: "50" })).items).toHaveLength(1);
  });

  it("uses an explicit point for near=me and ignores near=me without one", async () => {
    const t = await mk("m", { startPoint: { lon: 77.5946, lat: 13.1516 } });
    const withPoint = await run({ near: "me", state: "ss-m" }, { lat: 12.9716, lon: 77.5946 });
    expect(withPoint.items.map((i) => i.slug)).toEqual([t.slug]);
    expect(withPoint.origin).toMatchObject({ kind: "point" });
    const without = await run({ near: "me", state: "ss-m" });
    expect(without.origin).toBeNull();
  });

  it("reports an unknown place instead of failing", async () => {
    const result = await run({ near: "no-such-place" });
    expect(result).toMatchObject({ items: [], total: 0, unknownPlace: true });
  });

  it("uses only the public point of sensitive trails and skips ones without it", async () => {
    const withPoint = await mk("s", { sensitivity: "sensitive", startPoint: { lon: 77.5946, lat: 13.1516 }, publicPoint: { lon: 77.5946, lat: 13.9716 } });
    const without = await mk("s", { sensitivity: "restricted_geometry", startPoint: { lon: 77.5946, lat: 13.1516 } });
    const result = await run({ near: "bengaluru", state: "ss-s", radius: "300" });
    expect(result.items.map((i) => i.slug)).toEqual([withPoint.slug]);
    expect(result.items[0]!.distanceFromKm).toBeGreaterThan(100); // from the approximate point (~111 km), not the exact start (~20 km)
    expect(JSON.stringify(result)).not.toContain("13.1516");
    expect(result.items.map((i) => i.slug)).not.toContain(without.slug);
  });

  it("does not expose coordinates of sensitive trails beyond the public point", async () => {
    const t = await mk("p", { sensitivity: "sensitive", startPoint: { lon: 75.123456, lat: 13.654321 }, publicPoint: { lon: 75.0, lat: 13.5 } });
    const result = await run({ state: "ss-p" });
    const item = result.items.find((i) => i.slug === t.slug)!;
    expect(item).toMatchObject({ lon: 75, lat: 13.5 });
    expect(JSON.stringify(result)).not.toContain("75.123456");
  });
});

describe("sorting and paging", () => {
  it("sorts by difficulty and by length", async () => {
    const h = await mk("o", { difficulty: "hard", distanceKm: 5, name: "Sort hard" });
    const e = await mk("o", { difficulty: "easy", distanceKm: 50, name: "Sort easy" });
    expect((await run({ state: "ss-o", sort: "difficulty" })).items.map((i) => i.slug)).toEqual([e.slug, h.slug]);
    expect((await run({ state: "ss-o", sort: "distance" })).items.map((i) => i.slug)).toEqual([h.slug, e.slug]);
  });

  it("pages results and reports the total", async () => {
    for (let i = 0; i < 25; i++) await mk("pg", { name: `Paged trail ${String(i).padStart(2, "0")}` });
    const p1 = await run({ state: "ss-pg", sort: "relevance" });
    const p2 = await run({ state: "ss-pg", page: "2", sort: "relevance" });
    const p3 = await run({ state: "ss-pg", page: "3" });
    expect(p1.total).toBe(25);
    expect(p1.items).toHaveLength(20);
    expect(p2.items).toHaveLength(5);
    expect(p3.items).toHaveLength(0);
    expect(p3.total).toBe(25);
    expect(new Set([...p1.items, ...p2.items].map((i) => i.slug)).size).toBe(25);
  });
});

describe("hostile input", () => {
  it.each(["'; drop table trail;--", "%", "_", "\\", "&|!():*", "a".repeat(500), "\u0000", "😀", '"unterminated', "OR 1=1"])("is safe for q=%j", async (q) => {
    await expect(run({ q })).resolves.toBeDefined();
    const [row] = await db.sql`select count(*)::int as n from trail`;
    expect(row!.n).toBeGreaterThan(0);
  });
  it("is safe for odd filter values", async () => {
    await expect(run({ state: "x'; drop", terrain: "'; --", month: "NaN", page: "1e9", radius: "-1" })).resolves.toBeDefined();
  });
});

describe("findPlace", () => {
  it("finds a place by slug and rejects bad slugs without querying", async () => {
    expect(await asAnon(db.sql, (tx) => findPlace(tx, "bengaluru"))).toMatchObject({ slug: "bengaluru", name: "Bengaluru" });
    expect(await asAnon(db.sql, (tx) => findPlace(tx, "nope"))).toBeNull();
    expect(await findPlace(new Proxy({}, { get() { throw new Error("no sql"); } }) as never, "BAD SLUG")).toBeNull();
  });
});

describe("suggest", () => {
  it("returns trails, places and regions", async () => {
    await mk("g", { name: "Bangalore bypass explorer" });
    const s = await asAnon(db.sql, (tx) => suggest(tx, "bangalore"));
    expect(s.places.map((p) => p.slug)).toContain("bengaluru");
    expect(s.trails.map((t) => t.name)).toContain("Bangalore bypass explorer");
    const k = await asAnon(db.sql, (tx) => suggest(tx, "kera"));
    expect(k.regions.map((r) => r.slug)).toContain("kerala");
  });
  it("matches typos and aliases for places", async () => {
    expect((await asAnon(db.sql, (tx) => suggest(tx, "trivandrum"))).places.map((p) => p.slug)).toContain("thiruvananthapuram");
    expect((await asAnon(db.sql, (tx) => suggest(tx, "banglore"))).places.map((p) => p.slug)).toContain("bengaluru");
  });
  it("treats wildcard characters literally and caps the lists", async () => {
    const wild = await asAnon(db.sql, (tx) => suggest(tx, "%"));
    expect(wild.trails).toHaveLength(0);
    expect(wild.places).toHaveLength(0);
    const many = await asAnon(db.sql, (tx) => suggest(tx, "a"));
    expect(many.places.length).toBeLessThanOrEqual(5);
    expect(many.trails.length).toBeLessThanOrEqual(5);
    expect(many.regions.length).toBeLessThanOrEqual(5);
  });
  it("returns empty groups for an empty query", async () => {
    expect(await suggest(new Proxy({}, { get() { throw new Error("no sql"); } }) as never, "  ")).toEqual({ trails: [], places: [], regions: [] });
  });
});

describe("searchMapPoints", () => {
  it("returns public points for every match without paging, honouring filters and a cap", async () => {
    for (let i = 0; i < 5; i++) await mk("mp", { name: `Map point ${i}` });
    await mk("mp", { lifecycle: "draft", name: "Map hidden" });
    const all = await asAnon(db.sql, (tx) => searchMapPoints(tx, parseSearchParams({ state: "ss-mp" }), {}));
    expect(all).toHaveLength(5);
    expect(all[0]).toMatchObject({ slug: expect.any(String), name: expect.any(String), accessClass: "public" });
    const capped = await asAnon(db.sql, (tx) => searchMapPoints(tx, parseSearchParams({ state: "ss-mp" }), { limit: 3 }));
    expect(capped).toHaveLength(3);
  });
  it("never includes the exact start of a sensitive trail or trails with no public point", async () => {
    const withPoint = await mk("mq", { sensitivity: "sensitive", startPoint: { lon: 75.123456, lat: 13.654321 }, publicPoint: { lon: 75, lat: 13.5 } });
    await mk("mq", { sensitivity: "restricted_geometry" });
    const points = await asAnon(db.sql, (tx) => searchMapPoints(tx, parseSearchParams({ state: "ss-mq" }), {}));
    expect(points.map((p) => p.slug)).toEqual([withPoint.slug]);
    expect(points[0]).toMatchObject({ lon: 75, lat: 13.5 });
    expect(JSON.stringify(points)).not.toContain("75.123456");
  });
  it("limits to a place radius", async () => {
    await mk("mr", { startPoint: { lon: 77.5946, lat: 13.1516 } });
    await mk("mr", { startPoint: { lon: 76.6394, lat: 12.2958 } });
    const near = await asAnon(db.sql, (tx) => searchMapPoints(tx, parseSearchParams({ state: "ss-mr", near: "bengaluru", radius: "50" }), {}));
    expect(near).toHaveLength(1);
  });
});
