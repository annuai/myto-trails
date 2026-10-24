import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { asAnon, createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const slugs = async (view: string) =>
  (await asAnon(db.sql, (tx) => tx`select slug from ${tx(view)}`)).map((r) => r.slug as string);

describe("base tables are closed to the anonymous role", () => {
  it.each(["region", "trail", "trail_revision", "access_assessment", "evidence", "condition_event", "media"])(
    "anon cannot select from %s",
    async (table) => {
      await expect(asAnon(db.sql, (tx) => tx`select * from ${tx(table)} limit 1`)).rejects.toThrow(/permission denied/);
    },
  );
  it("anon cannot write", async () => {
    await expect(asAnon(db.sql, (tx) => tx`delete from trail`)).rejects.toThrow();
  });
});

describe("public_trails", () => {
  it("lists published trails and hides every other lifecycle", async () => {
    const pub = await insertTrailFixture(db.sql, { state: { slug: "s-life", name: "S life" }, district: null });
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const review = await insertTrailFixture(db.sql, { lifecycle: "in_review" });
    const unpublished = await insertTrailFixture(db.sql, { lifecycle: "unpublished" });
    const archived = await insertTrailFixture(db.sql, { lifecycle: "archived" });
    const listed = await slugs("public_trails");
    expect(listed).toContain(pub.slug);
    for (const hidden of [draft, review, unpublished, archived]) expect(listed).not.toContain(hidden.slug);
  });

  it("hides a published trail that has no published revision", async () => {
    const t = await insertTrailFixture(db.sql, { linkPublishedRevision: false });
    expect(await slugs("public_trails")).not.toContain(t.slug);
    expect(await slugs("public_trail_detail")).not.toContain(t.slug);
  });

  it("exposes the current access, condition and verification values", async () => {
    const t = await insertTrailFixture(db.sql, {
      accessClass: "permission_required",
      conditionStatus: "seasonal",
      verificationLevel: "community_reported",
      verifiedAt: "2026-02-03",
      validUntil: null,
    });
    const [row] = await asAnon(db.sql, (tx) => tx`select * from public_trails where slug = ${t.slug}`);
    expect(row).toMatchObject({
      access_class: "permission_required",
      condition_current: "seasonal",
      verification_level: "community_reported",
      verified_at: "2026-02-03",
      valid_until: null,
    });
  });
});

describe("public_trail_detail privacy", () => {
  it("has no private columns", async () => {
    const cols = await db.sql`select column_name from information_schema.columns where table_name = 'public_trail_detail'`;
    const names = cols.map((c) => c.column_name as string);
    expect(names).not.toContain("permission_contact");
    expect(names).not.toContain("start_point");
    expect(names).not.toContain("public_point");
    expect(names).toEqual(expect.arrayContaining(["lon", "lat", "evidence_count", "evidence_kinds"]));
  });

  it("never leaks the permission contact or evidence text through any public view", async () => {
    await insertTrailFixture(db.sql, {
      accessClass: "permission_required",
      permissionContact: "secret-contact@example.com",
      permissionInstructions: "Ask at the estate office.",
      evidence: [
        { kind: "written_confirmation", description: "private evidence detail text" },
        { kind: "signage_photo", description: "another private note" },
      ],
      mediaCount: 2,
    });
    for (const view of ["public_regions", "public_trails", "public_trail_detail", "public_trail_media"]) {
      const rows = await asAnon(db.sql, (tx) => tx`select to_jsonb(v)::text as j from ${tx(view)} v`);
      const all = rows.map((r) => r.j as string).join("\n");
      expect(all).not.toContain("secret-contact@example.com");
      expect(all).not.toContain("private evidence detail text");
      expect(all).not.toContain("another private note");
    }
  });

  it("counts evidence and lists its kinds without descriptions", async () => {
    const t = await insertTrailFixture(db.sql, {
      evidence: [
        { kind: "written_confirmation", description: "x" },
        { kind: "signage_photo", description: "y" },
        { kind: "signage_photo", description: "z" },
      ],
    });
    const [row] = await asAnon(db.sql, (tx) => tx`select evidence_count, evidence_kinds from public_trail_detail where slug = ${t.slug}`);
    expect(row!.evidence_count).toBe(3);
    expect([...(row!.evidence_kinds as string[])].sort()).toEqual(["signage_photo", "written_confirmation"]);
  });

  it("shows the exact start only for standard trails", async () => {
    const std = await insertTrailFixture(db.sql, { startPoint: { lon: 75.123456, lat: 13.654321 } });
    const [a] = await asAnon(db.sql, (tx) => tx`select lon, lat from public_trail_detail where slug = ${std.slug}`);
    expect(a!.lon).toBeCloseTo(75.123456, 5);
    expect(a!.lat).toBeCloseTo(13.654321, 5);
  });

  it("shows only the approximate point for sensitive trails", async () => {
    const t = await insertTrailFixture(db.sql, {
      sensitivity: "sensitive",
      startPoint: { lon: 75.123456, lat: 13.654321 },
      publicPoint: { lon: 75.0, lat: 13.5 },
    });
    const [row] = await asAnon(db.sql, (tx) => tx`select lon, lat from public_trail_detail where slug = ${t.slug}`);
    expect(row!.lon).toBeCloseTo(75.0, 6);
    expect(row!.lat).toBeCloseTo(13.5, 6);
    const [json] = await asAnon(db.sql, (tx) => tx`select to_jsonb(v)::text as j from public_trail_detail v where slug = ${t.slug}`);
    expect(json!.j).not.toContain("75.123456");
    expect(json!.j).not.toContain("13.654321");
  });

  it("gives no location for a sensitive trail without an approximate point", async () => {
    const t = await insertTrailFixture(db.sql, { sensitivity: "restricted_geometry", startPoint: { lon: 75.2, lat: 13.7 } });
    const [row] = await asAnon(db.sql, (tx) => tx`select lon, lat from public_trail_detail where slug = ${t.slug}`);
    expect(row).toMatchObject({ lon: null, lat: null });
  });
});

describe("public_trail_media and public_regions", () => {
  it("lists media only for published trails", async () => {
    const pub = await insertTrailFixture(db.sql, { mediaCount: 2 });
    const hidden = await insertTrailFixture(db.sql, { lifecycle: "draft", mediaCount: 1 });
    const rows = await asAnon(db.sql, (tx) => tx`select trail_slug, role from public_trail_media`);
    expect(rows.filter((r) => r.trail_slug === pub.slug).map((r) => r.role).sort()).toEqual(["cover", "gallery"]);
    expect(rows.some((r) => r.trail_slug === hidden.slug)).toBe(false);
  });

  it("counts only published trails per region", async () => {
    const state = { slug: "count-state", name: "Count State" };
    await insertTrailFixture(db.sql, { state, district: { slug: "count-d", name: "Count D" } });
    await insertTrailFixture(db.sql, { state, district: { slug: "count-d", name: "Count D" } });
    await insertTrailFixture(db.sql, { state, district: { slug: "count-d", name: "Count D" }, lifecycle: "draft" });
    const rows = await asAnon(db.sql, (tx) => tx`select slug, kind, published_trail_count from public_regions where slug in ('count-state', 'count-d')`);
    expect(rows.find((r) => r.slug === "count-state")!.published_trail_count).toBe(2);
    expect(rows.find((r) => r.slug === "count-d")!.published_trail_count).toBe(2);
  });
});
