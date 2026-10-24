import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../testing/db";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

let counter = 0;
const uid = () => `${++counter}`;

async function makeTrail() {
  const n = uid();
  const [state] = await db.sql`insert into region (kind, name, slug) values ('state', ${"State " + n}, ${"state-" + n}) returning id`;
  const [district] = await db.sql`insert into region (kind, name, slug, parent_id) values ('district', ${"District " + n}, ${"district-" + n}, ${state!.id}) returning id`;
  const [trail] = await db.sql`insert into trail (slug, region_id, state_id) values (${"trail-" + n}, ${district!.id}, ${state!.id}) returning id`;
  return trail!.id as string;
}

type RevisionOverrides = Partial<{ name: string; summary: string; terrain: string[]; bestMonths: number[]; lon: number; lat: number }>;
async function addRevision(trailId: string, o: RevisionOverrides = {}) {
  const v = {
    name: "Valid trail name",
    summary: "A valid summary that is comfortably longer than forty characters.",
    terrain: ["gravel"],
    bestMonths: [11, 12, 1],
    lon: 76.1,
    lat: 11.6,
    ...o,
  };
  return db.sql`insert into trail_revision (trail_id, version_no, name, summary, nearest_town, start_point, difficulty, terrain, best_months)
    values (${trailId}, ${Number(uid())}, ${v.name}, ${v.summary}, 'Town',
      ST_SetSRID(ST_MakePoint(${v.lon}, ${v.lat}), 4326)::geography, 'moderate', ${v.terrain}, ${v.bestMonths})`;
}

describe("extensions and roles", () => {
  it("installs postgis and pg_trgm", async () => {
    const rows = await db.sql`select extname from pg_extension where extname in ('postgis', 'pg_trgm')`;
    expect(rows.map((r) => r.extname).sort()).toEqual(["pg_trgm", "postgis"]);
  });
  it("has the anon and authenticated roles", async () => {
    const rows = await db.sql`select rolname from pg_roles where rolname in ('anon', 'authenticated')`;
    expect(rows.map((r) => r.rolname).sort()).toEqual(["anon", "authenticated"]);
  });
});

describe("revision constraints", () => {
  it("accepts a valid revision", async () => {
    await expect(addRevision(await makeTrail())).resolves.toBeDefined();
  });
  it.each([
    ["a 2-character name", { name: "ab" }],
    ["an 81-character name", { name: "x".repeat(81) }],
    ["a 39-character summary", { summary: "x".repeat(39) }],
    ["a 401-character summary", { summary: "x".repeat(401) }],
    ["no terrain", { terrain: [] }],
    ["an unknown terrain value", { terrain: ["lava"] }],
    ["a month outside 1-12", { bestMonths: [13] }],
    ["a start point outside India", { lon: 0, lat: 0 }],
  ] satisfies [string, RevisionOverrides][])("rejects %s", async (_label, overrides) => {
    await expect(addRevision(await makeTrail(), overrides)).rejects.toThrow();
  });
});

describe("other constraints", () => {
  it("rejects valid_until on or before verified_at", async () => {
    const trailId = await makeTrail();
    await expect(
      db.sql`insert into access_assessment (trail_id, access_class, basis, level, verified_at, valid_until)
        values (${trailId}, 'public', 'owner_confirmed', 'moderator_verified', '2026-06-01', '2026-06-01')`,
    ).rejects.toThrow();
  });
  it("rejects two regions with the same slug under one parent", async () => {
    const n = uid();
    const [state] = await db.sql`insert into region (kind, name, slug) values ('state', ${"S" + n}, ${"s-" + n}) returning id`;
    await db.sql`insert into region (kind, name, slug, parent_id) values ('district', 'A', 'same', ${state!.id})`;
    await expect(db.sql`insert into region (kind, name, slug, parent_id) values ('district', 'B', 'same', ${state!.id})`).rejects.toThrow();
  });
  it("rejects an unknown access class", async () => {
    const trailId = await makeTrail();
    await expect(
      db.sql`insert into access_assessment (trail_id, access_class, basis, level) values (${trailId}, 'open_to_all', 'none', 'unverified')`,
    ).rejects.toThrow();
  });
});

describe("current-state triggers", () => {
  const current = async (trailId: string) =>
    (await db.sql`select access_class_current, access_verification_level_current, access_verified_until::text as until, condition_current
      from trail where id = ${trailId}`)[0]!;

  it("defaults to unknown for both", async () => {
    const row = await current(await makeTrail());
    expect(row).toMatchObject({ access_class_current: "unknown", access_verification_level_current: "unverified", until: null, condition_current: "unknown" });
  });

  it("copies the latest access assessment onto the trail", async () => {
    const trailId = await makeTrail();
    await db.sql`insert into access_assessment (trail_id, access_class, basis, level, verified_at, valid_until)
      values (${trailId}, 'permission_required', 'owner_confirmed', 'moderator_verified', '2026-01-01', '2027-01-01')`;
    expect(await current(trailId)).toMatchObject({
      access_class_current: "permission_required",
      access_verification_level_current: "moderator_verified",
      until: "2027-01-01",
    });
    await db.sql`insert into access_assessment (trail_id, access_class, basis, level) values (${trailId}, 'public', 'rider_observed', 'unverified')`;
    expect(await current(trailId)).toMatchObject({
      access_class_current: "public",
      access_verification_level_current: "unverified",
      until: null,
    });
  });

  it("uses the condition event with the latest effective date", async () => {
    const trailId = await makeTrail();
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'open', '2026-01-01', 'moderator')`;
    expect((await current(trailId)).condition_current).toBe("open");
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'temporarily_closed', '2026-03-01', 'moderator')`;
    expect((await current(trailId)).condition_current).toBe("temporarily_closed");
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'open', '2026-02-01', 'report')`;
    expect((await current(trailId)).condition_current).toBe("temporarily_closed");
  });
});

describe("condition events that are not yet in effect", () => {
  it("do not replace the current condition", async () => {
    const trailId = await makeTrail();
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'temporarily_closed', '2026-01-01', 'moderator')`;
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'open', '2099-01-01', 'moderator')`;
    const [row] = await db.sql`select condition_current from trail where id = ${trailId}`;
    expect(row!.condition_current).toBe("temporarily_closed");
  });
  it("leave the condition unknown when every event is in the future", async () => {
    const trailId = await makeTrail();
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${trailId}, 'open', '2099-01-01', 'moderator')`;
    const [row] = await db.sql`select condition_current from trail where id = ${trailId}`;
    expect(row!.condition_current).toBe("unknown");
  });
});
