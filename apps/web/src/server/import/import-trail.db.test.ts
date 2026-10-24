import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedRegions } from "../db/seed-regions";
import { asAnon, createTestDatabase } from "../testing/db";
import { ImportError, importTrail } from "./import-trail";
import type { TrailImport } from "./schema";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const samples = JSON.parse(readFileSync(fileURLToPath(new URL("../../../data/sample-trails.json", import.meta.url)), "utf8")) as TrailImport[];
let counter = 0;
const record = (overrides: Partial<TrailImport> = {}): TrailImport => {
  const n = ++counter;
  return { ...structuredClone(samples[0]!), name: `Sample import trail ${n}`, slug: `sample-import-trail-${n}`, publish: true, ...overrides };
};
const production = { production: false };

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
      await expect(importTrail(db.sql, { ...s, slug: `${s.slug}-all`, publish: true }, production)).resolves.toBeDefined();
    }
  });

  it("refuses sample records in production", async () => {
    await expect(importTrail(db.sql, record(), { production: true })).rejects.toThrow(ImportError);
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
