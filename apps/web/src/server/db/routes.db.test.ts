import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const place = { state: { slug: "kerala", name: "Kerala" }, district: null };
let n = 0;

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const wkt = (lon: number, lat0: number, count: number, step = 0.001, lonStep = 0) =>
  `LINESTRING(${Array.from({ length: count }, (_, i) => `${lon + i * lonStep} ${lat0 + i * step}`).join(",")})`;

async function addRoute(revisionId: string | null, line = wkt(76.1, 11.6, 50), extra: { fingerprint?: string } = {}) {
  const [r] = await db.sql`
    insert into route (revision_id, geometry, simplified, distance_km, elev_gain_m, elev_loss_m, min_elev_m, max_elev_m, point_count, profile, fingerprint)
    values (${revisionId}, ST_GeomFromText(${line}, 4326), ST_GeomFromText(${line}, 4326), 5.43, 120, 80, 100, 220, 50,
      ${db.sql.json([{ d: 0, e: 100 }, { d: 5.43, e: 220 }])}, ${extra.fingerprint ?? `fp-${++n}`})
    returning id`;
  return r!.id as string;
}
const addGpx = (routeId: string, status = "ready") =>
  db.sql`insert into gpx_file (route_id, storage_key_original, sha256, size_bytes, status) values (${routeId}, ${`gpx/o/${++n}.gpx`}, ${`sha${n}`}, 1000, ${status})`;
const user = async () => (await db.sql`insert into app_user (email, display_name) values (${`u${++n}@example.test`}, 'Uploader') returning id`)[0]!.id as string;

describe("upload pipeline tables", () => {
  it.each(["upload", "route", "gpx_file"])("anon cannot read %s", async (table) => {
    await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
  });

  it("validates upload kind, status and unique storage keys, and cascades with the user", async () => {
    const u = await user();
    const ins = (kind: string, key: string, status = "pending") =>
      db.sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status) values (${u}, ${kind}, 'quarantine', ${key}, 'application/gpx+xml', 10, ${status})`;
    await ins("gpx", `gpx/${u}/a.gpx`);
    await expect(ins("video", `gpx/${u}/b.gpx`)).rejects.toThrow();
    await expect(ins("gpx", `gpx/${u}/c.gpx`, "weird")).rejects.toThrow();
    await expect(ins("gpx", `gpx/${u}/a.gpx`)).rejects.toThrow();
    await db.sql`delete from app_user where id = ${u}`;
    const [c] = await db.sql`select count(*)::int as n from upload where storage_key like ${`gpx/${u}/%`}`;
    expect(c!.n).toBe(0);
  });

  it("allows draft media and draft routes that are not attached to a revision yet", async () => {
    await expect(db.sql`insert into media (revision_id, role, alt_text) values (null, 'gallery', 'Draft photo')`).resolves.toBeDefined();
    await expect(addRoute(null)).resolves.toBeDefined();
  });

  it("limits a revision to one route and removes the route with the revision", async () => {
    const t = await insertTrailFixture(db.sql, { ...place });
    await addRoute(t.revisionId);
    await expect(addRoute(t.revisionId)).rejects.toThrow();
    await db.sql`delete from trail where id = ${t.trailId}`;
    const [c] = await db.sql`select count(*)::int as n from route where revision_id = ${t.revisionId}`;
    expect(c!.n).toBe(0);
  });

  it("checks gpx_file source and status values", async () => {
    const r = await addRoute(null);
    await expect(db.sql`insert into gpx_file (route_id, source, storage_key_original, sha256) values (${r}, 'carrier-pigeon', 'k1', 'h1')`).rejects.toThrow();
    await expect(addGpx(r, "weird")).rejects.toThrow();
    await expect(addGpx(r)).resolves.toBeDefined();
  });
});

describe("public_trail_route", () => {
  it("shows the simplified route and statistics for a published standard trail", async () => {
    const t = await insertTrailFixture(db.sql, { ...place });
    await addRoute(t.revisionId);
    const [row] = await asAnon(db.sql, (tx) => tx`select distance_km, elev_gain_m, point_count, profile, simplified_geojson from public_trail_route where slug = ${t.slug}`);
    expect(Number(row!.distance_km)).toBeCloseTo(5.43, 2);
    expect(row!.elev_gain_m).toBe(120);
    expect(JSON.parse(row!.simplified_geojson as string).type).toBe("LineString");
    expect(row!.profile).toHaveLength(2);
  });

  it("hides routes of sensitive, draft, unpublished and superseded-revision trails", async () => {
    const sens = await insertTrailFixture(db.sql, { ...place, sensitivity: "sensitive", publicPoint: { lon: 76, lat: 11.5 } });
    const draft = await insertTrailFixture(db.sql, { ...place, lifecycle: "draft" });
    const unpub = await insertTrailFixture(db.sql, { ...place, lifecycle: "unpublished" });
    const old = await insertTrailFixture(db.sql, { ...place });
    for (const t of [sens, draft, unpub, old]) await addRoute(t.revisionId);
    // a newer approved revision becomes the published one; the old revision's route must disappear
    const [rev2] = await db.sql`insert into trail_revision (trail_id, version_no, state, name, summary, nearest_town, start_point, difficulty, terrain)
      select trail_id, 2, 'approved', name, summary, nearest_town, start_point, difficulty, terrain from trail_revision where id = ${old.revisionId} returning id`;
    await db.sql`update trail set published_revision_id = ${rev2!.id} where id = ${old.trailId}`;
    const rows = await asAnon(db.sql, (tx) => tx`select slug from public_trail_route`);
    const slugs = rows.map((r) => r.slug as string);
    for (const t of [sens, draft, unpub, old]) expect(slugs).not.toContain(t.slug);
  });

  it("never exposes the full geometry or the fingerprint", async () => {
    const cols = (await db.sql`select column_name from information_schema.columns where table_name = 'public_trail_route'`).map((c) => c.column_name as string);
    expect(cols).not.toContain("geometry");
    expect(cols).not.toContain("fingerprint");
    expect(cols).not.toContain("created_by");
  });
});

describe("has_gpx on the public detail view", () => {
  const hasGpx = async (slug: string) => (await asAnon(db.sql, (tx) => tx`select has_gpx from public_trail_detail where slug = ${slug}`))[0]!.has_gpx as boolean;

  it("is true only with a ready GPX attached to the published revision", async () => {
    const withGpx = await insertTrailFixture(db.sql, { ...place });
    await addGpx(await addRoute(withGpx.revisionId));
    const retired = await insertTrailFixture(db.sql, { ...place });
    await addGpx(await addRoute(retired.revisionId), "retired");
    const noRoute = await insertTrailFixture(db.sql, { ...place });
    const routeOnly = await insertTrailFixture(db.sql, { ...place });
    await addRoute(routeOnly.revisionId);
    expect(await hasGpx(withGpx.slug)).toBe(true);
    expect(await hasGpx(retired.slug)).toBe(false);
    expect(await hasGpx(noRoute.slug)).toBe(false);
    expect(await hasGpx(routeOnly.slug)).toBe(false);
  });
});

describe("find_similar_routes", () => {
  const addPublished = async (line: string) => addRoute((await insertTrailFixture(db.sql, { ...place })).revisionId, line);
  const similar = async (line: string, exclude: string | null = null) =>
    db.sql`select route_id, similarity from find_similar_routes(ST_GeomFromText(${line}, 4326), ${exclude})`;

  it("finds an identical route with similarity about 1", async () => {
    const line = wkt(77.0, 10.0, 60);
    const id = await addPublished(line);
    const rows = await similar(line);
    expect(rows.find((r) => r.route_id === id)!.similarity).toBeGreaterThan(0.95);
  });

  it("still matches a route shifted by about 10 m", async () => {
    const id = await addPublished(wkt(77.2, 10.0, 60));
    const rows = await similar(wkt(77.2001, 10.0, 60)); // 0.0001 degrees of longitude is about 11 m
    expect(rows.find((r) => r.route_id === id)!.similarity).toBeGreaterThan(0.9);
  });

  it("does not match a parallel route 500 m away or an unrelated route", async () => {
    const id = await addPublished(wkt(77.4, 10.0, 60));
    expect((await similar(wkt(77.4045, 10.0, 60))).map((r) => r.route_id)).not.toContain(id); // about 490 m east
    expect((await similar(wkt(78.5, 15.0, 60))).map((r) => r.route_id)).not.toContain(id);
  });

  it("excludes the route being checked", async () => {
    const line = wkt(77.6, 10.0, 60);
    const id = await addPublished(line);
    expect((await similar(line, id)).map((r) => r.route_id)).not.toContain(id);
  });

  it("judges overlap against the shorter route, so a short copy of part of a long trail matches", async () => {
    const id = await addPublished(wkt(77.8, 10.0, 200));
    const rows = await similar(wkt(77.8, 10.05, 40)); // the middle 40 points of the long route
    expect(rows.find((r) => r.route_id === id)!.similarity).toBeGreaterThan(0.9);
  });

  it("never reports uploads, drafts or sensitive trails: only published standard trails", async () => {
    const line = wkt(78.0, 10.0, 60);
    const upload = await addRoute(null, line);
    const draft = await addRoute((await insertTrailFixture(db.sql, { ...place, lifecycle: "draft" })).revisionId, line);
    const sensitive = await addRoute((await insertTrailFixture(db.sql, { ...place, sensitivity: "sensitive", publicPoint: { lon: 78, lat: 10 } })).revisionId, line);
    const ids = (await similar(line)).map((r) => r.route_id);
    for (const hidden of [upload, draft, sensitive]) expect(ids).not.toContain(hidden);
  });

  it("anon cannot call it", async () => {
    await expect(asAnon(db.sql, (tx) => tx`select * from find_similar_routes(ST_GeomFromText('LINESTRING(77 10,77 10.1)', 4326), null)`)).rejects.toThrow(/permission denied/);
  });
});
