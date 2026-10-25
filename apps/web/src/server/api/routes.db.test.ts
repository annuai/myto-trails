// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { line, makeGpx } from "../gpx/fixtures";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { seedRegions } from "../db/seed-regions";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { createTestDatabase } from "../testing/db";
import { insertTrailFixture } from "../testing/fixtures";
import { makeUser } from "../testing/submission-fixture";
import { dispatch } from "./http";
import { routes } from "./routes";
import { createToken, type TokenScope } from "./tokens";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let storage: MemoryStorageProvider;
const now = new Date("2026-06-01T12:00:00Z");
beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
  storage = new MemoryStorageProvider();
});
afterAll(async () => {
  await db.drop();
});

async function call(method: string, path: string, o: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}) {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  const res = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers, body: o.raw ?? (o.body === undefined ? undefined : JSON.stringify(o.body)) }), routes, { sql: db.sql, storage, now, siteUrl: "https://moto-trails.com" });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, body: body as Record<string, any>, headers: res.headers, text }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
async function rider(scopes: TokenScope[] = ["saved", "write:submission"]) {
  const userId = await makeUser(db.sql);
  const t = await createToken(db.sql, { userId, kind: "app_android", label: "Test", scopes });
  if (!t.ok) throw new Error();
  return { userId, token: t.token };
}
const place = { state: { slug: "api-state", name: "Api State" }, district: null };

describe("errors, auth and limits", () => {
  it("answers unknown paths with 404 and wrong methods with 405, in one error shape", async () => {
    const a = await call("GET", "/nope");
    expect(a).toMatchObject({ status: 404, body: { error: { code: "not_found" } } });
    expect((await call("DELETE", "/trails")).status).toBe(405);
  });

  it("requires a valid token where needed and the right scope", async () => {
    expect((await call("GET", "/me/saved")).status).toBe(401);
    expect(await call("GET", "/me/saved", { token: "mt_wrong" })).toMatchObject({ status: 401, body: { error: { code: "invalid_token" } } });
    expect((await call("GET", "/trails", { headers: { authorization: "Basic abc" } })).status).toBe(401);
    const onlySubmit = await rider(["write:submission"]);
    expect(await call("GET", "/me/saved", { token: onlySubmit.token })).toMatchObject({ status: 403, body: { error: { code: "insufficient_scope" } } });
    const onlySaved = await rider(["saved"]);
    expect((await call("POST", "/submissions", { token: onlySaved.token, body: { clientId: crypto.randomUUID() } })).status).toBe(403);
  });

  it("limits anonymous callers per address", async () => {
    const h = { "x-real-ip": "203.0.113.77" };
    for (let i = 0; i < 120; i++) expect((await call("GET", "/openapi.json", { headers: h })).status).toBe(200);
    expect((await call("GET", "/openapi.json", { headers: h })).status).toBe(429);
    expect((await call("GET", "/openapi.json", { headers: { "x-real-ip": "203.0.113.78" } })).status).toBe(200);
  });

  it("treats HEAD as GET, ignores bearer case, and does not let route dots match other characters", async () => {
    expect((await call("HEAD", "/trails")).status).toBe(200);
    const { token } = await rider();
    expect((await call("GET", "/me/saved", { headers: { authorization: `bearer ${token}` } })).status).toBe(200);
    expect((await call("GET", "/openapiXjson")).status).toBe(404);
  });

  it("stops reading a body that is bigger than the limit, even without a content-length", async () => {
    const { token } = await rider();
    const big = new ReadableStream({ start(c) { for (let i = 0; i < 20; i++) c.enqueue(new TextEncoder().encode("x".repeat(10_000))); c.close(); } });
    const res = await dispatch(new Request("http://localhost/api/v1/submissions", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: big, duplex: "half" } as RequestInit), routes, { sql: db.sql, storage, now, siteUrl: "x" });
    expect(res.status).toBe(413);
  });

  it("rejects oversized and malformed bodies cleanly", async () => {
    const { token } = await rider();
    expect((await call("POST", "/submissions", { token, raw: "{not json" })).body.error.code).toBe("invalid_json");
    expect((await call("POST", "/submissions", { token, raw: JSON.stringify({ x: "a".repeat(70_000) }) })).status).toBe(413);
  });
});

describe("public trails", () => {
  it("lists and searches published trails and returns one trail with effective status", async () => {
    const t = await insertTrailFixture(db.sql, { ...place, name: "Api ridge loop" });
    await insertTrailFixture(db.sql, { ...place, name: "Draft trail", lifecycle: "draft" });
    const list = await call("GET", "/trails?q=ridge");
    expect(list.status).toBe(200);
    expect(list.body.items.map((i: { slug: string }) => i.slug)).toContain(t.slug);
    expect(list.body.items.map((i: { name: string }) => i.name)).not.toContain("Draft trail");
    const one = await call("GET", `/trails/${t.slug}`);
    expect(one).toMatchObject({ status: 200, body: { slug: t.slug, name: "Api ridge loop", condition: "open" } });
    expect(Array.isArray(one.body.media)).toBe(true); // photos come with the trail, so a client needs no second call
    expect((await call("GET", "/trails/no-such-trail")).status).toBe(404);
    expect((await call("GET", "/trails/BAD SLUG!")).status).toBe(404);
  });

  it("never exposes the exact start of a sensitive trail", async () => {
    const t = await insertTrailFixture(db.sql, { ...place, sensitivity: "sensitive", publicPoint: { lon: 77.5, lat: 10.5 }, startPoint: { lon: 77.123456, lat: 10.123456 } });
    const r = await call("GET", `/trails/${t.slug}`);
    expect(r.text).not.toContain("77.123456");
    expect(r.text).not.toContain("10.123456");
    expect((await call("GET", `/trails/${t.slug}/route`)).status).toBe(404);
    expect([403, 404]).toContain((await call("GET", `/trails/${t.slug}/gpx`)).status);
  });

  it("serves the route and a GPX only where the website would", async () => {
    const t = await insertTrailFixture(db.sql, place);
    const bytes = new TextEncoder().encode(makeGpx(line(120, { lat: 10.5, lon: 77.2 }, { ele: (i) => 700 + i })));
    const ing = ingestGpx(bytes);
    if (!ing.ok) throw new Error();
    await storage.put("originals", "gpx/api/a-clean.gpx", new TextEncoder().encode(ing.cleanGpx), "application/gpx+xml");
    await db.sql.begin((tx) => insertRoute(tx, { ingested: ing, revisionId: t.revisionId, userId: null, originalKey: "gpx/api/a.gpx", cleanKey: "gpx/api/a-clean.gpx", sha256: "a".repeat(64), sizeBytes: 10 }));
    const route = await call("GET", `/trails/${t.slug}/route`);
    expect(route.body.line.length).toBeGreaterThan(1);
    const gpx = await call("GET", `/trails/${t.slug}/gpx`);
    expect(gpx.status).toBe(200);
    expect(gpx.headers.get("content-type")).toContain("application/gpx+xml");
    expect(gpx.text).toContain("Read before riding");
    const closed = await insertTrailFixture(db.sql, { ...place, conditionStatus: "permanently_closed" });
    await db.sql.begin((tx) => insertRoute(tx, { ingested: ing, revisionId: closed.revisionId, userId: null, originalKey: "gpx/api/b.gpx", cleanKey: "gpx/api/a-clean.gpx", sha256: "b".repeat(64), sizeBytes: 10 }));
    expect((await call("GET", `/trails/${closed.slug}/gpx`)).status).toBe(403);
  });
});

describe("saved and sync", () => {
  it("saves, lists and removes trails for the token's user only, and syncs changes", async () => {
    const a = await rider();
    const b = await rider();
    const t = await insertTrailFixture(db.sql, place);
    expect((await call("PUT", `/me/saved/${t.slug}`, { token: a.token })).status).toBe(204);
    expect((await call("PUT", `/me/saved/${t.slug}`, { token: a.token })).status).toBe(204);
    expect((await call("PUT", "/me/saved/no-such-trail", { token: a.token })).status).toBe(404);
    expect((await call("GET", "/me/saved", { token: a.token })).body.items.map((i: { trail: { slug: string } }) => i.trail.slug)).toEqual([t.slug]);
    expect((await call("GET", "/me/saved", { token: b.token })).body.items).toEqual([]);
    expect((await call("DELETE", `/me/saved/${t.slug}`, { token: b.token })).status).toBe(204);
    expect((await call("GET", "/me/saved", { token: a.token })).body.items).toHaveLength(1);

    const before = await call("GET", "/sync?since=2020-01-01T00:00:00Z", { token: a.token });
    expect(before.body.changed.map((x: { slug: string }) => x.slug)).toEqual([t.slug]);
    const later = await call("GET", "/sync?since=2999-01-01T00:00:00Z", { token: a.token });
    expect(later.body.changed).toEqual([]);
    // A trail saved after `since` is reported even if the trail itself is old.
    expect((await call("GET", `/sync?since=${new Date(Date.now() - 60_000).toISOString()}`, { token: a.token })).body.changed.map((x: { slug: string }) => x.slug)).toEqual([t.slug]);
    await db.sql`update trail set lifecycle = 'unpublished' where id = ${t.trailId}`;
    expect((await call("GET", "/sync?since=2020-01-01T00:00:00Z", { token: a.token })).body.removed).toHaveLength(1);
    expect((await call("GET", "/sync?since=garbage", { token: a.token })).status).toBe(400);

    expect((await call("DELETE", `/me/saved/${t.slug}`, { token: a.token })).status).toBe(204);
  });
});

describe("uploads, submissions and reports", () => {
  it("runs the whole contributor flow through the API with an idempotent draft", async () => {
    const { token, userId } = await rider();
    const clientId = crypto.randomUUID();
    const d1 = await call("POST", "/submissions", { token, body: { clientId } });
    const d2 = await call("POST", "/submissions", { token, body: { clientId } });
    expect(d1.status).toBe(201);
    expect(d2.body.id).toBe(d1.body.id);
    const id = d1.body.id as string;

    const up = await call("POST", "/uploads", { token, body: { kind: "gpx", contentType: "application/gpx+xml", sizeBytes: 5000 } });
    expect(up.status).toBe(201);
    expect(up.body.target.method).toBe("PUT");
    const [row] = await db.sql`select storage_key from upload where id = ${up.body.uploadId}`;
    await storage.put("quarantine", row!.storage_key, new TextEncoder().encode("junk"), "application/gpx+xml");
    expect((await call("POST", `/uploads/${up.body.uploadId}/complete`, { token })).body.status).toBe("rejected"); // size mismatch
    expect((await call("GET", `/uploads/${up.body.uploadId}`, { token })).body.status).toBe("rejected");

    const steps: [number, unknown][] = [
      [1, { name: "Api submitted trail", summary: "A gravel ridge track with long views over the lake, suitable for dual sport bikes in dry weather.", state: "kerala", district: "Wayanad", nearestTown: "Kalpetta" }],
      [2, { startPoint: { lat: 11.6, lon: 76.1 }, routeShape: "loop" }],
      [3, { difficulty: "moderate", terrain: ["gravel"], suitableFor: [], bestMonths: [], hazards: [] }],
      [4, { accessClass: "public", restrictions: [], basis: "rider_observed", evidence: [{ kind: "other", description: "Open gate, no signage when I rode it." }] }],
      [5, []],
      [6, { licenceAccepted: true }],
    ];
    const bad = await call("PUT", `/submissions/${id}/steps/1`, { token, body: { name: "x" } });
    expect(bad).toMatchObject({ status: 422, body: { error: { code: "validation_failed", fields: { name: expect.any(String) } } } });
    expect((await call("POST", `/submissions/${id}/submit`, { token })).body.error.code).toBe("validation_failed");
    for (const [n, input] of steps) expect((await call("PUT", `/submissions/${id}/steps/${n}`, { token, body: input })).status).toBe(200);
    const sent = await call("POST", `/submissions/${id}/submit`, { token });
    expect(sent).toMatchObject({ status: 200, body: { slug: expect.stringMatching(/^api-submitted-trail/) } });
    expect((await call("GET", `/submissions/${id}`, { token })).body).toMatchObject({ status: "submitted" });
    expect((await call("GET", "/me/submissions", { token })).body.items).toHaveLength(1);
    expect(userId).toBeDefined();
  });

  it("keeps submissions and uploads private to their owner", async () => {
    const a = await rider();
    const b = await rider();
    const d = await call("POST", "/submissions", { token: a.token, body: { clientId: crypto.randomUUID() } });
    expect((await call("GET", `/submissions/${d.body.id}`, { token: b.token })).status).toBe(404);
    expect((await call("PUT", `/submissions/${d.body.id}/steps/2`, { token: b.token, body: {} })).status).toBe(404);
    expect((await call("POST", `/submissions/${d.body.id}/submit`, { token: b.token })).status).toBe(404);
    const up = await call("POST", "/uploads", { token: a.token, body: { kind: "image", contentType: "image/png", sizeBytes: 100 } });
    expect((await call("GET", `/uploads/${up.body.uploadId}`, { token: b.token })).status).toBe(404);
    expect((await call("POST", `/uploads/${up.body.uploadId}/complete`, { token: b.token })).status).toBe(404);
    expect((await call("POST", `/submissions/${d.body.id}/route`, { token: b.token, body: { uploadId: up.body.uploadId } })).status).toBe(404);
  });

  it("validates upload requests and step numbers", async () => {
    const { token } = await rider();
    expect((await call("POST", "/uploads", { token, body: { kind: "video", contentType: "video/mp4", sizeBytes: 1 } })).status).toBe(400);
    const d = await call("POST", "/submissions", { token, body: { clientId: crypto.randomUUID() } });
    expect((await call("PUT", `/submissions/${d.body.id}/steps/9`, { token, body: {} })).status).toBe(404);
    expect((await call("POST", "/submissions", { token, body: { clientId: "nope" } })).status).toBe(400);
  });

  it("accepts a report with the same rules as the website", async () => {
    const { token } = await rider();
    const t = await insertTrailFixture(db.sql, place);
    const ok = await call("POST", `/trails/${t.slug}/reports`, { token, body: { type: "closure", details: "The gate is locked and a guard turned us away." } });
    expect(ok).toMatchObject({ status: 201, body: { reference: expect.stringMatching(/^[0-9A-F]{8}$/) } });
    expect((await call("POST", `/trails/${t.slug}/reports`, { token, body: { type: "closure", details: "short" } })).status).toBe(422);
    expect((await call("POST", "/trails/no-such-trail/reports", { token, body: { type: "closure", details: "The gate is locked and a guard turned us away." } })).status).toBe(404);
  });
});

describe("openapi", () => {
  it("describes exactly the routes that exist", async () => {
    const doc = (await call("GET", "/openapi.json")).body;
    expect(doc.openapi).toMatch(/^3\.1/);
    const described = Object.entries(doc.paths as Record<string, Record<string, unknown>>).flatMap(([p, ms]) => Object.keys(ms).map((m) => `${m.toUpperCase()} ${p}`)).sort();
    const real = routes.map((r) => `${r.method} ${r.path}`).sort();
    expect(described).toEqual(real);
    expect(doc.components.securitySchemes.deviceToken).toMatchObject({ type: "http", scheme: "bearer" });
  });
});
