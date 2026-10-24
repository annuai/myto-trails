import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { isSaved, listSaved, markSavedSeen, saveTrail, unsaveTrail } from "./saved";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-06-01T12:00:00Z");
const place = { state: { slug: "kerala", name: "Kerala" }, district: null };
let n = 0;

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});

const user = async () => {
  const [u] = await db.sql`insert into app_user (email, display_name) values (${`saver${++n}@example.test`}, 'Saver') returning id`;
  return u!.id as string;
};
const trail = (o = {}) => insertTrailFixture(db.sql, { ...place, ...o });

describe("saveTrail / unsaveTrail / isSaved", () => {
  it("saves a published trail once, creating one default collection, and removes it again", async () => {
    const u = await user();
    const t = await trail();
    expect(await saveTrail(db.sql, u, t.slug, now)).toEqual({ saved: true });
    expect(await saveTrail(db.sql, u, t.slug, now)).toEqual({ saved: true });
    expect(await isSaved(db.sql, u, t.slug)).toBe(true);
    const [c] = await db.sql`select count(*)::int as n from collection where user_id = ${u} and is_default`;
    const [i] = await db.sql`select count(*)::int as n from collection_item ci join collection c on c.id = ci.collection_id where c.user_id = ${u}`;
    expect(c!.n).toBe(1);
    expect(i!.n).toBe(1);
    await unsaveTrail(db.sql, u, t.slug);
    expect(await isSaved(db.sql, u, t.slug)).toBe(false);
    await expect(unsaveTrail(db.sql, u, t.slug)).resolves.toBeUndefined();
  });

  it("refuses unpublished, unknown and malformed slugs without touching the database for bad slugs", async () => {
    const u = await user();
    const draft = await trail({ lifecycle: "draft" });
    expect(await saveTrail(db.sql, u, draft.slug, now)).toEqual({ saved: false, reason: "not_found" });
    expect(await saveTrail(db.sql, u, "no-such-trail", now)).toEqual({ saved: false, reason: "not_found" });
    for (const bad of ["UPPER", "a/b", "x'; drop table trail;--", "a".repeat(200), ""]) {
      expect(await saveTrail(db.sql, u, bad, now)).toEqual({ saved: false, reason: "not_found" });
      expect(await isSaved(db.sql, u, bad)).toBe(false);
    }
  });

  it("keeps each user's saved trails separate", async () => {
    const a = await user();
    const b = await user();
    const t = await trail();
    await saveTrail(db.sql, a, t.slug, now);
    expect(await isSaved(db.sql, b, t.slug)).toBe(false);
    expect(await listSaved(db.sql, b, now)).toEqual([]);
    await unsaveTrail(db.sql, b, t.slug); // must not remove a's item
    expect(await isSaved(db.sql, a, t.slug)).toBe(true);
  });
});

describe("listSaved", () => {
  it("returns saved trails with no changes right after saving, newest first", async () => {
    const u = await user();
    const t1 = await trail({ name: "First saved" });
    const t2 = await trail({ name: "Second saved" });
    await saveTrail(db.sql, u, t1.slug, now);
    await saveTrail(db.sql, u, t2.slug, now);
    const items = await listSaved(db.sql, u, now);
    expect(items.map((i) => i.trail?.name)).toEqual(["Second saved", "First saved"]);
    expect(items.every((i) => i.changes.length === 0)).toBe(true);
  });

  it("reports an access change and floats changed trails to the top", async () => {
    const u = await user();
    const calm = await trail({ name: "Calm trail" });
    const changing = await trail({ name: "Changing trail", accessClass: "public" });
    await saveTrail(db.sql, u, changing.slug, now);
    await saveTrail(db.sql, u, calm.slug, now);
    await db.sql`insert into access_assessment (trail_id, access_class, basis, level) values (${changing.trailId}, 'permission_required', 'owner_confirmed', 'community_reported')`;
    const items = await listSaved(db.sql, u, now);
    expect(items[0]!.trail?.slug).toBe(changing.slug);
    expect(items[0]!.changes).toEqual(expect.arrayContaining([{ field: "access", from: "public", to: "permission_required" }]));
    expect(items[1]!.changes).toEqual([]);
  });

  it("reports a condition change", async () => {
    const u = await user();
    const t = await trail();
    await saveTrail(db.sql, u, t.slug, now);
    await db.sql`insert into condition_event (trail_id, status, effective_from, source) values (${t.trailId}, 'temporarily_closed', '2026-05-01', 'moderator')`;
    const [item] = await listSaved(db.sql, u, now);
    expect(item!.changes).toEqual([{ field: "condition", from: "open", to: "temporarily_closed" }]);
  });

  it("reports an expired verification as a change", async () => {
    const u = await user();
    const t = await trail({ verificationLevel: "moderator_verified", verifiedAt: "2026-01-01", validUntil: "2026-12-01" });
    await saveTrail(db.sql, u, t.slug, now);
    const later = new Date("2027-02-01T00:00:00Z");
    const [item] = await listSaved(db.sql, u, later);
    expect(item!.changes).toEqual([{ field: "verification", from: "moderator_verified", to: "unverified" }]);
  });

  it("clears changes once they have been seen", async () => {
    const u = await user();
    const t = await trail();
    await saveTrail(db.sql, u, t.slug, now);
    await db.sql`insert into access_assessment (trail_id, access_class, basis, level) values (${t.trailId}, 'restricted', 'owner_confirmed', 'community_reported')`;
    expect((await listSaved(db.sql, u, now))[0]!.changes.length).toBeGreaterThan(0);
    await markSavedSeen(db.sql, u, t.slug, now);
    expect((await listSaved(db.sql, u, now))[0]!.changes).toEqual([]);
  });

  it("marks a saved trail that is no longer published as unavailable without revealing it", async () => {
    const u = await user();
    const t = await trail({ name: "Secret later" });
    await saveTrail(db.sql, u, t.slug, now);
    await db.sql`update trail set lifecycle = 'unpublished' where id = ${t.trailId}`;
    const [item] = await listSaved(db.sql, u, now);
    expect(item!.trail).toBeNull();
    expect(JSON.stringify(item)).not.toContain("Secret later");
    expect(item!.unavailableId).toBe(t.trailId);
  });

  it("removes saved items when a user is deleted", async () => {
    const u = await user();
    const t = await trail();
    await saveTrail(db.sql, u, t.slug, now);
    await db.sql`delete from app_user where id = ${u}`;
    const [c] = await db.sql`select count(*)::int as n from collection_item where trail_id = ${t.trailId}`;
    expect(c!.n).toBe(0);
  });
});
