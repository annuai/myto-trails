// @vitest-environment node
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GPX_MAX_BYTES, IMAGE_MAX_BYTES } from "@moto-trails/domain";
import { line, makeGpx } from "../gpx/fixtures";
import { parseGpx } from "../gpx/parse";
import { insertTrailFixture } from "../testing/fixtures";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { createTestDatabase } from "../testing/db";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { completeUpload, getUploadStatus, requestUpload } from "./service";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let storage: MemoryStorageProvider;
let n = 0;

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const user = async () => (await db.sql`insert into app_user (email, display_name) values (${`up${++n}@example.test`}, 'Uploader') returning id`)[0]!.id as string;
const fresh = () => {
  storage = new MemoryStorageProvider();
  return storage;
};
const enc = (s: string) => new TextEncoder().encode(s);

/** Requests an upload and simulates the browser PUT. */
async function upload(userId: string, kind: "gpx" | "image", bytes: Uint8Array, contentType: string, declared = bytes.byteLength) {
  const r = await requestUpload(db.sql, storage, { userId, kind, contentType, sizeBytes: declared });
  if (!r.ok) throw new Error(`request failed: ${r.reason}`);
  const [row] = await db.sql`select storage_key, bucket from upload where id = ${r.uploadId}`;
  await storage.put(row!.bucket, row!.storage_key, bytes, r.contentType);
  return { id: r.uploadId, key: row!.storage_key as string, target: r.target };
}

describe("requestUpload", () => {
  beforeAll(() => fresh());

  it("creates a pending upload and a signed target for a GPX file", async () => {
    fresh();
    const u = await user();
    const r = await requestUpload(db.sql, storage, { userId: u, kind: "gpx", contentType: "application/octet-stream", sizeBytes: 1234 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.target.method).toBe("PUT");
    expect(r.contentType).toBe("application/gpx+xml"); // browsers often label .gpx as octet-stream; we tell them what to send
    const [row] = await db.sql`select user_id, kind, status, bucket, storage_key, size_bytes from upload where id = ${r.uploadId}`;
    expect(row).toMatchObject({ user_id: u, kind: "gpx", status: "pending", bucket: "quarantine", size_bytes: 1234 });
    expect(row!.storage_key).toMatch(new RegExp(`^gpx/${u}/[0-9a-f-]{36}\\.gpx$`));
  });

  it.each([
    ["an unknown kind", { kind: "video", contentType: "video/mp4", sizeBytes: 100 }],
    ["an image with a document content type", { kind: "image", contentType: "application/pdf", sizeBytes: 100 }],
    ["a GPX over the size limit", { kind: "gpx", contentType: "application/gpx+xml", sizeBytes: GPX_MAX_BYTES + 1 }],
    ["an image over the size limit", { kind: "image", contentType: "image/jpeg", sizeBytes: IMAGE_MAX_BYTES + 1 }],
    ["a zero size", { kind: "gpx", contentType: "application/gpx+xml", sizeBytes: 0 }],
    ["a negative size", { kind: "gpx", contentType: "application/gpx+xml", sizeBytes: -5 }],
    ["a fractional size", { kind: "gpx", contentType: "application/gpx+xml", sizeBytes: 10.5 }],
  ])("refuses %s", async (_l, input) => {
    fresh();
    const r = await requestUpload(db.sql, storage, { userId: await user(), ...(input as { kind: "gpx"; contentType: string; sizeBytes: number }) });
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("allows 30 requests an hour per user and then refuses", async () => {
    fresh();
    const u = await user();
    for (let i = 0; i < 30; i++) expect((await requestUpload(db.sql, storage, { userId: u, kind: "image", contentType: "image/png", sizeBytes: 100 })).ok).toBe(true);
    expect(await requestUpload(db.sql, storage, { userId: u, kind: "image", contentType: "image/png", sizeBytes: 100 })).toMatchObject({ ok: false, reason: "rate_limited" });
    expect((await requestUpload(db.sql, storage, { userId: await user(), kind: "image", contentType: "image/png", sizeBytes: 100 })).ok).toBe(true);
  });
});

describe("completeUpload: GPX", () => {
  it("validates, stores the route and statistics, moves the original and keeps a sanitised copy", async () => {
    fresh();
    const u = await user();
    const gpx = enc(makeGpx(line(120, undefined, { ele: (i) => 100 + i })));
    const up = await upload(u, "gpx", gpx, "application/gpx+xml");
    const r = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(r).toMatchObject({ status: "ready", kind: "gpx" });
    if (r.status !== "ready" || !r.routeId) throw new Error("expected a ready route");

    const [route] = await db.sql`select distance_km, point_count, elev_gain_m, created_by, revision_id, fingerprint from route where id = ${r.routeId}`;
    expect(Number(route!.distance_km)).toBeGreaterThan(13);
    expect(route).toMatchObject({ point_count: 120, created_by: u, revision_id: null });
    expect(route!.elev_gain_m).toBeGreaterThan(100);

    const [file] = await db.sql`select storage_key_original, storage_key_sanitised, sha256, size_bytes, status, source from gpx_file where route_id = ${r.routeId}`;
    expect(file).toMatchObject({ size_bytes: gpx.byteLength, status: "ready", source: "uploaded" });
    expect(file!.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await storage.head("quarantine", up.key)).toBeNull();
    expect(await storage.head("originals", file!.storage_key_original)).not.toBeNull();
    const clean = await storage.get("originals", file!.storage_key_sanitised);
    const parsed = parseGpx(new TextDecoder().decode(clean!));
    expect(parsed.ok && parsed.tracks[0]).toHaveLength(120);
    expect(r.similar ?? []).toEqual([]);
  });

  it("is idempotent: completing twice does not create a second route", async () => {
    fresh();
    const u = await user();
    const up = await upload(u, "gpx", enc(makeGpx(line(80))), "application/gpx+xml");
    const a = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    const b = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(a.status).toBe("ready");
    expect(b).toMatchObject({ status: "ready" });
    const [c] = await db.sql`select count(*)::int as n from route where created_by = ${u}`;
    expect(c!.n).toBe(1);
  });

  it("handles two simultaneous completions with a single route", async () => {
    fresh();
    const u = await user();
    const up = await upload(u, "gpx", enc(makeGpx(line(80))), "application/gpx+xml");
    await Promise.all([completeUpload(db.sql, storage, { userId: u, uploadId: up.id }), completeUpload(db.sql, storage, { userId: u, uploadId: up.id })]);
    const [c] = await db.sql`select count(*)::int as n from route where created_by = ${u}`;
    expect(c!.n).toBe(1);
  });

  it("flags a duplicate of a published trail but still accepts it, and never reveals other uploads", async () => {
    fresh();
    const u = await user();
    const track = enc(makeGpx(line(100, { lat: 10.5, lon: 77.3 })));
    const pub = await insertTrailFixture(db.sql, { state: { slug: "up-dup", name: "Up Dup" }, district: null });
    const ing = ingestGpx(track);
    if (!ing.ok) throw new Error("fixture");
    await db.sql.begin((tx) => insertRoute(tx, { ingested: ing, revisionId: pub.revisionId, userId: null, originalKey: "gpx/p/a.gpx", cleanKey: "gpx/p/a-c.gpx", sha256: "e".repeat(64), sizeBytes: 10 }));
    // Another rider's earlier upload of the same line is private and must not show up.
    await completeUpload(db.sql, storage, { userId: await user(), uploadId: (await upload(await user(), "gpx", track, "application/gpx+xml")).id }).catch(() => null);

    const r = await completeUpload(db.sql, storage, { userId: u, uploadId: (await upload(u, "gpx", track, "application/gpx+xml")).id });
    expect(r.status).toBe("ready");
    expect(r.similar).toEqual([expect.objectContaining({ slug: pub.slug })]);
    expect(r.similar![0]!.similarity).toBeGreaterThan(0.9);
    expect(JSON.stringify(r.similar)).not.toMatch(/routeId/);
  });

  it("leaves no stored objects behind when the database write fails", async () => {
    fresh();
    const u = await user();
    await db.sql`create or replace function mt_test_fail() returns trigger language plpgsql as $$ begin raise exception 'boom'; end $$`;
    await db.sql`create trigger mt_test_fail before insert on gpx_file for each row execute function mt_test_fail()`;
    try {
      const up = await upload(u, "gpx", enc(makeGpx(line(80))), "application/gpx+xml");
      const r = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
      expect(r).toMatchObject({ status: "rejected", rejectCode: "processing_failed" });
      expect(await storage.head("quarantine", up.key)).toBeNull();
      expect(await storage.head("originals", up.key)).toBeNull();
      expect(await storage.head("originals", up.key.replace(/\.gpx$/, "-clean.gpx"))).toBeNull();
    } finally {
      await db.sql`drop trigger mt_test_fail on gpx_file`;
    }
  });

  it.each([
    ["a file that is not GPX", enc("hello, this is not a GPX file"), /does not look like a GPX/i],
    ["a GPX with an entity declaration", enc('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><gpx version="1.1"/>'), /not allowed|unsafe/i],
    ["a track with one point", enc(makeGpx(line(1))), /Only 1 track point/],
    ["a track outside India", enc(makeGpx(line(100, { lat: 51.5, lon: -0.1 }))), /outside India/i],
    ["a track that teleports", enc(makeGpx([...line(50), ...line(50, { lat: 18.6, lon: 76.1 })])), /jumps/i],
  ])("rejects %s with a clear message and leaves nothing behind", async (_l, bytes, message) => {
    fresh();
    const u = await user();
    const up = await upload(u, "gpx", bytes, "application/gpx+xml");
    const r = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(r.status).toBe("rejected");
    expect(r.rejectMessage).toMatch(message);
    expect(await storage.head("quarantine", up.key)).toBeNull();
    const [c] = await db.sql`select count(*)::int as n from route where created_by = ${u}`;
    expect(c!.n).toBe(0);
  });

  it("rejects an upload that never arrived or that is bigger than declared", async () => {
    fresh();
    const u = await user();
    const missing = await requestUpload(db.sql, storage, { userId: u, kind: "gpx", contentType: "application/gpx+xml", sizeBytes: 100 });
    if (!missing.ok) throw new Error("setup");
    expect(await completeUpload(db.sql, storage, { userId: u, uploadId: missing.uploadId })).toMatchObject({ status: "rejected", rejectCode: "missing" });

    const up = await upload(u, "gpx", enc(makeGpx(line(80))), "application/gpx+xml", 10); // declared 10 bytes, sent much more
    const r = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(r).toMatchObject({ status: "rejected", rejectCode: "size_mismatch" });
    expect(await storage.head("quarantine", up.key)).toBeNull();
  });

  it("will not let another user complete or read someone else's upload", async () => {
    fresh();
    const owner = await user();
    const other = await user();
    const up = await upload(owner, "gpx", enc(makeGpx(line(80))), "application/gpx+xml");
    expect(await completeUpload(db.sql, storage, { userId: other, uploadId: up.id })).toEqual({ status: "not_found" });
    expect(await getUploadStatus(db.sql, other, up.id)).toEqual({ status: "not_found" });
    expect((await getUploadStatus(db.sql, owner, up.id)).status).toBe("pending");
    expect(await completeUpload(db.sql, storage, { userId: other, uploadId: "not-a-uuid" })).toEqual({ status: "not_found" });
  });
});

describe("completeUpload: images", () => {
  it("stores variants in the public bucket, the original privately, and a draft media row", async () => {
    fresh();
    const u = await user();
    const photo = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#b06020" } }).jpeg().toBuffer();
    const up = await upload(u, "image", new Uint8Array(photo), "image/jpeg");
    const r = await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(r).toMatchObject({ status: "ready", kind: "image" });
    if (!r.mediaId) throw new Error("expected media");

    const [m] = await db.sql`select revision_id, role, uploaded_by, placeholder, width, height, variants, variants_avif from media where id = ${r.mediaId}`;
    expect(m).toMatchObject({ revision_id: null, uploaded_by: u, width: 2400, height: 1600 });
    expect(m!.placeholder).toMatch(/^data:image\/webp;base64,/);
    expect(Object.keys(m!.variants).sort()).toEqual(["1200", "1800", "400", "800"]);
    expect(Object.keys(m!.variants_avif).sort()).toEqual(["1200", "400", "800"]);
    const url800 = m!.variants["800"] as string;
    expect(url800).toMatch(/^memory:\/\/public\/image\//);
    expect(url800).not.toContain(u); // public URLs must not reveal the uploader's account id
    const key800 = url800.replace("memory://public/", "");
    expect((await storage.head("public", key800))!.contentType).toBe("image/webp");
    expect(await storage.head("quarantine", up.key)).toBeNull();
  });

  it("rejects a non-image and an unsupported format", async () => {
    fresh();
    const u = await user();
    const text = await upload(u, "image", enc("<html><script>alert(1)</script></html>"), "image/jpeg");
    expect(await completeUpload(db.sql, storage, { userId: u, uploadId: text.id })).toMatchObject({ status: "rejected" });
    const gif = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#f00" } }).gif().toBuffer();
    const g = await upload(u, "image", new Uint8Array(gif), "image/png");
    expect(await completeUpload(db.sql, storage, { userId: u, uploadId: g.id })).toMatchObject({ status: "rejected", rejectCode: "unsupported_format" });
    expect(await storage.head("quarantine", g.key)).toBeNull();
  });
});

describe("getUploadStatus", () => {
  it("reports pending, ready and rejected states to the owner", async () => {
    fresh();
    const u = await user();
    const up = await upload(u, "gpx", enc("nope"), "application/gpx+xml");
    expect((await getUploadStatus(db.sql, u, up.id)).status).toBe("pending");
    await completeUpload(db.sql, storage, { userId: u, uploadId: up.id });
    expect(await getUploadStatus(db.sql, u, up.id)).toMatchObject({ status: "rejected", rejectMessage: expect.any(String) });
  });
});
