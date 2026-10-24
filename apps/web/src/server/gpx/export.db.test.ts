// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { line, makeGpx } from "./fixtures";
import { buildGpxExport } from "./export";
import { ingestGpx, insertRoute } from "./ingest";
import { parseGpx } from "./parse";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let storage: MemoryStorageProvider;
const now = new Date("2026-06-01T12:00:00Z");
const siteUrl = "https://moto-trails.com";
let n = 0;

beforeAll(async () => {
  db = await createTestDatabase();
  storage = new MemoryStorageProvider();
});
afterAll(async () => {
  await db.drop();
});

async function trailWithGpx(o: Parameters<typeof insertTrailFixture>[1] = {}, gpxExtra = "") {
  const k = ++n;
  const t = await insertTrailFixture(db.sql, { state: { slug: "ex-state", name: "Ex State" }, district: { slug: "ex-d", name: "Ex D" }, ...o });
  const bytes = new TextEncoder().encode(makeGpx(line(120, { lat: 10.5, lon: 77.2 }, { ele: (i) => 700 + i, time: (i) => Date.UTC(2026, 0, 1) + i * 5000 }), gpxExtra));
  const ingested = ingestGpx(bytes);
  if (!ingested.ok) throw new Error("fixture");
  const originalKey = `gpx/${t.slug}/o${k}.gpx`;
  const cleanKey = `gpx/${t.slug}/o${k}-clean.gpx`;
  await storage.put("originals", originalKey, bytes, "application/gpx+xml");
  await storage.put("originals", cleanKey, new TextEncoder().encode(ingested.cleanGpx), "application/gpx+xml");
  await db.sql.begin((tx) => insertRoute(tx, { ingested, revisionId: t.revisionId, userId: null, originalKey, cleanKey, sha256: "b".repeat(64), sizeBytes: bytes.byteLength }));
  return t;
}
const exp = (slug: string) => buildGpxExport({ sql: db.sql, storage, slug, now, siteUrl });

describe("buildGpxExport", () => {
  it("regenerates a plain GPX 1.1 with access metadata, a link to the trail page, no timestamps and no extensions", async () => {
    const t = await trailWithGpx({ accessClass: "permission_required", permissionInstructions: "Call the range office." });
    const r = await exp(t.slug);
    if (!r.ok) throw new Error(r.reason);
    expect(r.filename).toBe(`${t.slug}.gpx`);
    expect(r.xml).toContain('version="1.1"');
    expect(r.xml).toContain(`<link href="${siteUrl}/trails/${t.slug}">`);
    expect(r.xml).toMatch(/<desc>[^<]*Access: Permission required[^<]*Condition: Open[^<]*Read before riding: https:\/\/moto-trails\.com\/trails\//);
    expect(r.xml).not.toMatch(/<time>|<extensions>|<script/i);
    const parsed = parseGpx(r.xml);
    expect(parsed.ok && parsed.tracks[0]).toHaveLength(120);
    expect(parsed.ok && parsed.name).toContain("Fixture trail");
  });

  it("increments the download count", async () => {
    const t = await trailWithGpx();
    await exp(t.slug);
    await exp(t.slug);
    const [row] = await db.sql`select g.download_count from gpx_file g join route r on r.id = g.route_id where r.revision_id = ${t.revisionId}`;
    expect(row!.download_count).toBe(2);
  });

  it.each([
    ["a sensitive trail", { sensitivity: "sensitive" as const, publicPoint: { lon: 77, lat: 10 } }, "sensitive_area"],
    ["a restricted-access trail", { accessClass: "restricted" as const }, "access_not_allowed"],
    ["a permanently closed trail", { conditionStatus: "permanently_closed" as const }, "permanently_closed"],
    ["an unpublished trail", { lifecycle: "unpublished" as const }, "not_found"],
  ])("refuses %s", async (_l, overrides, reason) => {
    const t = await trailWithGpx(overrides);
    expect(await exp(t.slug)).toEqual({ ok: false, reason });
  });

  it("reports no_gpx for a trail without one, and not_found for unknown or malformed slugs", async () => {
    const t = await insertTrailFixture(db.sql, { state: { slug: "ex-state", name: "Ex State" } });
    expect(await exp(t.slug)).toEqual({ ok: false, reason: "no_gpx" });
    expect(await exp("no-such-trail")).toEqual({ ok: false, reason: "not_found" });
    expect(await exp("../../etc/passwd")).toEqual({ ok: false, reason: "not_found" });
  });

  it("reports unavailable when the stored copy is missing from storage", async () => {
    const t = await trailWithGpx();
    const [f] = await db.sql`select g.storage_key_sanitised as k from gpx_file g join route r on r.id = g.route_id where r.revision_id = ${t.revisionId}`;
    await storage.remove("originals", f!.k);
    expect(await exp(t.slug)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("limits downloads to 30 an hour per address", async () => {
    const t = await trailWithGpx();
    for (let k = 0; k < 30; k++) expect((await buildGpxExport({ sql: db.sql, storage, slug: t.slug, now, siteUrl, ipHash: "h1" })).ok).toBe(true);
    expect(await buildGpxExport({ sql: db.sql, storage, slug: t.slug, now, siteUrl, ipHash: "h1" })).toEqual({ ok: false, reason: "rate_limited" });
    expect((await buildGpxExport({ sql: db.sql, storage, slug: t.slug, now, siteUrl, ipHash: "h2" })).ok).toBe(true);
  });
});
