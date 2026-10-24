import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INDIA_STATES, isValidSlug } from "@moto-trails/domain";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";
import { seedRegions } from "./seed-regions";
import { seedPlaces, type PlaceSeed } from "./seed-places";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const places = JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/places.json", import.meta.url)), "utf8")) as PlaceSeed[];

beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});

describe("data/places.json", () => {
  it("has at least 100 places with unique valid slugs, known states and India coordinates", () => {
    expect(places.length).toBeGreaterThanOrEqual(100);
    expect(new Set(places.map((p) => p.slug)).size).toBe(places.length);
    const states = new Set(INDIA_STATES.map((s) => s.slug));
    for (const p of places) {
      expect(isValidSlug(p.slug), p.slug).toBe(true);
      expect(states.has(p.state), `${p.slug} state ${p.state}`).toBe(true);
      expect(p.lat).toBeGreaterThan(6);
      expect(p.lat).toBeLessThan(37);
      expect(p.lon).toBeGreaterThan(68);
      expect(p.lon).toBeLessThan(98);
      expect(p.rank).toBeGreaterThanOrEqual(1);
      expect(p.rank).toBeLessThanOrEqual(5);
    }
  });
  it("lists Bengaluru with Bangalore as an alias", () => {
    const b = places.find((p) => p.slug === "bengaluru")!;
    expect(b.altNames).toContain("Bangalore");
  });
});

describe("seedPlaces", () => {
  it("inserts every place once and nothing on a rerun", async () => {
    expect((await seedPlaces(db.sql, places)).inserted).toBe(places.length);
    expect((await seedPlaces(db.sql, places)).inserted).toBe(0);
  });
  it("rejects an unknown state", async () => {
    await expect(seedPlaces(db.sql, [{ slug: "x-town", name: "X Town", altNames: [], kind: "town", state: "atlantis", lat: 10, lon: 76, rank: 3 }])).rejects.toThrow(/Unknown state/);
  });
});

describe("public_places", () => {
  it("is readable by anon with place, state and coordinates, and the table is closed", async () => {
    const [row] = await asAnon(db.sql, (tx) => tx`select slug, name, state_slug, lon, lat from public_places where slug = 'bengaluru'`);
    expect(row).toMatchObject({ slug: "bengaluru", name: "Bengaluru", state_slug: "karnataka" });
    expect(row!.lat).toBeCloseTo(12.97, 1);
    await expect(asAnon(db.sql, (tx) => tx`select * from place limit 1`)).rejects.toThrow(/permission denied/);
  });
  it("finds places by alias with trigram matching, including typos", async () => {
    const find = async (q: string) =>
      (await asAnon(db.sql, (tx) => tx`select slug from public_places where search_text % ${q.toLowerCase()} order by similarity(search_text, ${q.toLowerCase()}) desc limit 3`)).map((r) => r.slug);
    expect(await find("bangalore")).toContain("bengaluru");
    expect(await find("bengaluru")).toContain("bengaluru");
    expect(await find("banglore")).toContain("bengaluru");
    expect(await find("trivandrum")).toContain("thiruvananthapuram");
  });
});

describe("public_trail_search", () => {
  it("exposes only the public point and the closed flag", async () => {
    const closedPast = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, conditionStatus: "temporarily_closed", expectedUntil: "2020-01-01" });
    const closedFuture = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, conditionStatus: "temporarily_closed", expectedUntil: "2099-01-01" });
    const permanent = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, conditionStatus: "permanently_closed" });
    const open = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null });
    const flags = async (slug: string) => (await asAnon(db.sql, (tx) => tx`select closed from public_trail_search where slug = ${slug}`))[0]!.closed;
    expect(await flags(closedPast.slug)).toBe(false);
    expect(await flags(closedFuture.slug)).toBe(true);
    expect(await flags(permanent.slug)).toBe(true);
    expect(await flags(open.slug)).toBe(false);
  });

  it("never exposes the exact start of a sensitive trail", async () => {
    const t = await insertTrailFixture(db.sql, {
      state: { slug: "kerala", name: "Kerala" }, district: null, sensitivity: "sensitive",
      startPoint: { lon: 75.123456, lat: 13.654321 }, publicPoint: { lon: 75.0, lat: 13.5 },
    });
    const [row] = await asAnon(db.sql, (tx) => tx`select lon, lat, st_astext(geog::geometry) as wkt, to_jsonb(v)::text as j from public_trail_search v where slug = ${t.slug}`);
    expect(row).toMatchObject({ lon: 75, lat: 13.5 });
    expect(row!.j).not.toContain("75.123456");
    expect(row!.wkt).not.toContain("75.123456");
  });

  it("has no location for a sensitive trail without a public point", async () => {
    const t = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, sensitivity: "restricted_geometry" });
    const [row] = await asAnon(db.sql, (tx) => tx`select lon, lat, geog is null as no_geog from public_trail_search where slug = ${t.slug}`);
    expect(row).toMatchObject({ lon: null, lat: null, no_geog: true });
  });

  it("matches text on name and nearest town with weights, and hides unpublished trails", async () => {
    const a = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, name: "Zanzibar ridge track" });
    const hidden = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, name: "Zanzibar hidden", lifecycle: "draft" });
    const rows = await asAnon(db.sql, (tx) => tx`select slug from public_trail_search where search_tsv @@ websearch_to_tsquery('simple', 'zanzibar')`);
    expect(rows.map((r) => r.slug)).toContain(a.slug);
    expect(rows.map((r) => r.slug)).not.toContain(hidden.slug);
  });

  it("flags verified trails only while verification is current", async () => {
    const current = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, verificationLevel: "moderator_verified", validUntil: "2099-01-01" });
    const expired = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, verificationLevel: "moderator_verified", verifiedAt: "2020-01-01", validUntil: "2021-01-01" });
    const community = await insertTrailFixture(db.sql, { state: { slug: "kerala", name: "Kerala" }, district: null, verificationLevel: "community_reported", validUntil: null });
    const v = async (slug: string) => (await asAnon(db.sql, (tx) => tx`select is_verified from public_trail_search where slug = ${slug}`))[0]!.is_verified;
    expect(await v(current.slug)).toBe(true);
    expect(await v(expired.slug)).toBe(false);
    expect(await v(community.slug)).toBe(false);
  });
});
