import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedRegions } from "../db/seed-regions";
import { line, makeGpx } from "../gpx/fixtures";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { asAnon, createTestDatabase } from "../testing/db";
import { ImportError, importTrail } from "./import-trail";
import type { TrailImport } from "./schema";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const samples = JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/sample-trails.json", import.meta.url)), "utf8")) as TrailImport[];
let counter = 0;
const record = (overrides: Partial<TrailImport> = {}): TrailImport => {
  const n = ++counter;
  return { ...structuredClone({ ...samples[0]!, gpxFile: undefined }), name: `Sample import trail ${n}`, slug: `sample-import-trail-${n}`, publish: true, ...overrides };
};
const production = { production: false, allowSamples: true };

beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});

describe("importTrail", () => {
  it("publishes a valid record so it appears in public_trails as a sample", async () => {
    const r = record();
    const { slug } = await importTrail(db.sql, r, production);
    const rows = await asAnon(db.sql, (tx) => tx`select slug, is_sample, access_class, district_name from public_trails where slug = ${slug}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ is_sample: true, access_class: "public" });
  });

  it("keeps a record unpublished when publish is false", async () => {
    const { slug } = await importTrail(db.sql, record({ publish: false }), production);
    const rows = await asAnon(db.sql, (tx) => tx`select slug from public_trails where slug = ${slug}`);
    expect(rows).toHaveLength(0);
  });

  it("imports every sample record", async () => {
    for (const s of samples) {
      const gpx = { storage: new MemoryStorageProvider(), read: (path: string) => new Uint8Array(readFileSync(fileURLToPath(new URL(`../../../data/${path}`, import.meta.url)))) };
      await expect(importTrail(db.sql, { ...s, slug: `${s.slug}-all`, publish: true }, { ...production, gpx })).resolves.toBeDefined();
    }
  });

  it("refuses sample records in production even when samples are allowed", async () => {
    await expect(importTrail(db.sql, record(), { production: true, allowSamples: true })).rejects.toThrow(ImportError);
  });

  it("refuses sample records unless samples are explicitly allowed", async () => {
    await expect(importTrail(db.sql, record(), { production: false })).rejects.toThrow(/allow-samples/);
    await expect(importTrail(db.sql, record(), { production: false, allowSamples: false })).rejects.toThrow(/allow-samples/);
  });

  it("refuses to publish a private_no_access trail", async () => {
    const r = record();
    r.access = { ...r.access, accessClass: "private_no_access" };
    await expect(importTrail(db.sql, r, production)).rejects.toThrow(/private_no_access/);
  });

  it("refuses a sensitive trail without a public point", async () => {
    const r = record({ sensitivity: "sensitive" });
    delete r.publicPoint;
    await expect(importTrail(db.sql, r, production)).rejects.toThrow(/publicPoint/);
  });

  it("refuses a moderator-verified access claim without evidence", async () => {
    const r = record();
    r.access = { ...r.access, level: "moderator_verified", evidence: [] };
    await expect(importTrail(db.sql, r, production)).rejects.toThrow(ImportError);
  });

  it("refuses an unknown state", async () => {
    await expect(importTrail(db.sql, record({ state: "atlantis" }), production)).rejects.toThrow(/state/);
  });

  it("refuses a duplicate slug and leaves the original untouched", async () => {
    const r = record();
    await importTrail(db.sql, r, production);
    await expect(importTrail(db.sql, { ...r, name: "Sample import trail changed" }, production)).rejects.toThrow(/already exists/);
    const [row] = await db.sql`select rev.name from trail t join trail_revision rev on rev.trail_id = t.id where t.slug = ${r.slug!}`;
    expect(row!.name).toBe(r.name);
  });

  it("rolls back everything when a later step fails", async () => {
    await db.sql.unsafe(`
      create function test_boom() returns trigger language plpgsql as $$ begin raise exception 'boom'; end $$;
      create trigger test_boom_media before insert on media for each row execute function test_boom();`);
    try {
      const r = record({ district: "Rollback District" });
      r.media = [{ role: "cover", position: 0, altText: "Alt", variants: { "800": "https://example.test/a.webp" } }];
      await expect(importTrail(db.sql, r, production)).rejects.toThrow(/boom/);
      const [t] = await db.sql`select count(*)::int as n from trail where slug = ${r.slug!}`;
      const [d] = await db.sql`select count(*)::int as n from region where slug = 'rollback-district'`;
      expect(t!.n).toBe(0);
      expect(d!.n).toBe(0);
    } finally {
      await db.sql.unsafe("drop trigger test_boom_media on media; drop function test_boom();");
    }
  });

  it("never echoes private values in error messages", async () => {
    const r = record();
    r.access = { ...r.access, permissionContact: "private-person@example.test", accessClass: "private_no_access" };
    try {
      await importTrail(db.sql, r, production);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).not.toContain("private-person@example.test");
    }
  });
});

describe("importTrail with a GPX file", () => {
  const gpx = new TextEncoder().encode(makeGpx(line(120, { lat: 11.6, lon: 76.1 }, { ele: (i) => 900 + i })));

  it("stores the route against the published revision and makes the GPX available", async () => {
    const storage = new MemoryStorageProvider();
    const { slug } = await importTrail(db.sql, record({ gpxFile: "x.gpx" }), { ...production, gpx: { read: () => gpx, storage } });
    const [d] = await asAnon(db.sql, (tx) => tx`select has_gpx from public_trail_detail where slug = ${slug}`);
    expect(d!.has_gpx).toBe(true);
    const [r] = await asAnon(db.sql, (tx) => tx`select distance_km, point_count from public_trail_route where slug = ${slug}`);
    expect(Number(r!.distance_km)).toBeGreaterThan(13);
    const [f] = await db.sql`select g.storage_key_sanitised from gpx_file g join route r on r.id = g.route_id join trail t on t.published_revision_id = r.revision_id where t.slug = ${slug}`;
    expect(await storage.head("originals", f!.storage_key_sanitised)).not.toBeNull();
  });

  it("fails the import, leaving no trail behind, when the GPX is invalid or unreadable", async () => {
    const storage = new MemoryStorageProvider();
    const bad = record({ gpxFile: "bad.gpx" });
    await expect(importTrail(db.sql, bad, { ...production, gpx: { read: () => new TextEncoder().encode("nope"), storage } })).rejects.toThrow(/GPX/);
    expect(await db.sql`select 1 from trail where slug = ${bad.slug!}`).toHaveLength(0);
    await expect(importTrail(db.sql, record({ gpxFile: "missing.gpx" }), { ...production, gpx: { read: () => null, storage } })).rejects.toThrow(/missing\.gpx/);
    await expect(importTrail(db.sql, record({ gpxFile: "x.gpx" }), production)).rejects.toThrow(/GPX/);
  });

  it("refuses a GPX for a sensitive trail", async () => {
    const storage = new MemoryStorageProvider();
    const sensitive = samples.find((s) => s.sensitivity === "sensitive")!;
    await expect(importTrail(db.sql, { ...structuredClone(sensitive), slug: "sample-sens-gpx", gpxFile: "x.gpx" }, { ...production, gpx: { read: () => gpx, storage } })).rejects.toThrow(/sensitive/i);
  });
});

describe("importTrail with videos", () => {
  const clip = { position: 0, description: "A slow pan across the lake shore", credit: "Annuai", mp4: "/videos/x/v.mp4", poster: "/videos/x/v.webp", width: 1280, height: 720, durationS: 20 };
  it("stores videos with the revision and shows them publicly", async () => {
    const { slug } = await importTrail(db.sql, record({ videos: [clip] } as Partial<TrailImport>), production);
    const rows = await asAnon(db.sql, (tx) => tx`select description, mp4_url, duration_s from public_trail_video where trail_slug = ${slug}`);
    expect(rows).toEqual([{ description: "A slow pan across the lake shore", mp4_url: "/videos/x/v.mp4", duration_s: 20 }]);
  });
  it("rejects a video without a real description", async () => {
    await expect(importTrail(db.sql, record({ videos: [{ ...clip, description: "ok" }] } as Partial<TrailImport>), production)).rejects.toThrow(/description/);
  });
});
