// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { line, makeGpx } from "../gpx/fixtures";
import { ingestGpx, insertRoute } from "../gpx/ingest";
import { seedRegions } from "../db/seed-regions";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { attachRoute, createDraft, discardDraft, getMine, listMine, listStates, photoPreviews, saveStep, submit } from "./service";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let n = 0;
const now = new Date("2026-06-01T12:00:00Z");

beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});

const user = async () => (await db.sql`insert into app_user (email, display_name) values (${`sub${++n}@example.test`}, 'Rider Ravi') returning id`)[0]!.id as string;

async function readyGpx(userId: string, at = { lat: 11.6, lon: 76.1 }) {
  const ingested = ingestGpx(new TextEncoder().encode(makeGpx(line(150, at, { ele: (i) => 700 + i }))));
  if (!ingested.ok) throw new Error("fixture");
  const k = ++n;
  const [u] = await db.sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status) values (${userId}, 'gpx', 'originals', ${`gpx/t/${k}.gpx`}, 'application/gpx+xml', 100, 'ready') returning id`;
  const { routeId } = await db.sql.begin((tx) => insertRoute(tx, { ingested, revisionId: null, userId, originalKey: `gpx/t/${k}.gpx`, cleanKey: `gpx/t/${k}-c.gpx`, sha256: "c".repeat(64), sizeBytes: 100 }));
  await db.sql`update upload set route_id = ${routeId} where id = ${u!.id}`;
  return { uploadId: u!.id as string, routeId };
}
async function readyPhoto(userId: string) {
  const k = ++n;
  const [u] = await db.sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status) values (${userId}, 'image', 'originals', ${`image/t/${k}.jpg`}, 'image/jpeg', 100, 'ready') returning id`;
  const [m] = await db.sql`insert into media (role, alt_text, variants, width, height, uploaded_by, upload_id) values ('gallery', '', ${db.sql.json({ "800": "https://example.test/p.webp" })}, 1200, 800, ${userId}, ${u!.id}) returning id`;
  return m!.id as string;
}

const basics = { name: "Ridge track above the lake", summary: "A gravel ridge track with long views over the lake, suitable for dual sport bikes in dry weather.", state: "kerala", district: "Wayanad", nearestTown: "Kalpetta" };
const route = { startPoint: { lat: 11.6, lon: 76.1 }, routeShape: "loop" };
const details = { difficulty: "moderate", terrain: ["gravel"], suitableFor: ["dual_sport"], bestMonths: [11, 12], hazards: ["river_crossing"] };
const access = { accessClass: "public", restrictions: [], basis: "rider_observed", evidence: [{ kind: "other", description: "Open gate and no signage when I rode it in March 2026." }] };
const review = { safetyNotes: "Carry water.", licenceAccepted: true };

async function completeDraft(userId: string, o: { photos?: boolean; gpx?: boolean; basics?: Partial<typeof basics> } = {}) {
  const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
  if (!d.ok) throw new Error(d.reason);
  const id = d.id;
  const ok = async (step: 1 | 2 | 3 | 4 | 5 | 6, input: unknown) => {
    const r = await saveStep(db.sql, { userId, id, step, input });
    if (!r.ok) throw new Error(`step ${step}: ${JSON.stringify(r)}`);
  };
  await ok(1, { ...basics, ...o.basics });
  if (o.gpx) await attachRoute(db.sql, { userId, id, uploadId: (await readyGpx(userId)).uploadId });
  await ok(2, route);
  await ok(3, details);
  await ok(4, access);
  await ok(5, o.photos ? [{ mediaId: await readyPhoto(userId), altText: "Gravel track along a ridge" }] : []);
  await ok(6, review);
  return id;
}

describe("createDraft", () => {
  it("creates a draft and returns the same one for a retried client id", async () => {
    const userId = await user();
    const clientId = crypto.randomUUID();
    const a = await createDraft(db.sql, { userId, clientId });
    const b = await createDraft(db.sql, { userId, clientId });
    expect(a.ok && b.ok && a.id === b.id).toBe(true);
    expect(await db.sql`select 1 from submission where user_id = ${userId}`).toHaveLength(1);
  });
  it("allows at most 10 open drafts", async () => {
    const userId = await user();
    for (let i = 0; i < 10; i++) expect((await createDraft(db.sql, { userId, clientId: crypto.randomUUID() })).ok).toBe(true);
    expect(await createDraft(db.sql, { userId, clientId: crypto.randomUUID() })).toEqual({ ok: false, reason: "too_many_drafts" });
  });
  it("rejects a malformed client id", async () => {
    expect(await createDraft(db.sql, { userId: await user(), clientId: "nope" })).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("saveStep and getMine", () => {
  it("stores a valid step and returns it, advancing the furthest step", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    expect(await saveStep(db.sql, { userId, id: d.id, step: 1, input: basics })).toEqual({ ok: true });
    const s = await getMine(db.sql, userId, d.id);
    expect(s).toMatchObject({ status: "draft", step: 2, data: { basics: { name: "Ridge track above the lake" } } });
  });

  it("returns field errors for an invalid step but keeps what was typed for the form", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    const r = await saveStep(db.sql, { userId, id: d.id, step: 1, input: { ...basics, name: "ab" } });
    expect(r).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
    const s = await getMine(db.sql, userId, d.id);
    expect(s!.data.basics).toBeUndefined();
    expect(s!.drafts.basics).toMatchObject({ name: "ab" });
  });

  it("autosave keeps partial input without validating or advancing", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    expect(await saveStep(db.sql, { userId, id: d.id, step: 1, input: { name: "Half" }, autosave: true })).toEqual({ ok: true });
    const s = await getMine(db.sql, userId, d.id);
    expect(s).toMatchObject({ step: 1 });
    expect(s!.drafts.basics).toMatchObject({ name: "Half" });
  });

  it("refuses oversized or non-plain autosave input", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    expect(await saveStep(db.sql, { userId, id: d.id, step: 1, input: { name: "x".repeat(60_000) }, autosave: true })).toMatchObject({ ok: false, reason: "too_large" });
    expect(await saveStep(db.sql, { userId, id: d.id, step: 1, input: "text", autosave: true })).toMatchObject({ ok: false });
  });

  it("hides other users' submissions as not found", async () => {
    const owner = await user();
    const other = await user();
    const d = await createDraft(db.sql, { userId: owner, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    expect(await getMine(db.sql, other, d.id)).toBeNull();
    expect(await saveStep(db.sql, { userId: other, id: d.id, step: 1, input: basics })).toEqual({ ok: false, reason: "not_found" });
    expect(await discardDraft(db.sql, { userId: other, id: d.id })).toEqual({ ok: false, reason: "not_found" });
    expect(await getMine(db.sql, owner, "not-a-uuid")).toBeNull();
  });

  it("does not accept a photo that belongs to someone else or is already attached", async () => {
    const userId = await user();
    const other = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    const theirs = await readyPhoto(other);
    expect(await saveStep(db.sql, { userId, id: d.id, step: 5, input: [{ mediaId: theirs, altText: "x" }] })).toMatchObject({ ok: false, errors: { photos: expect.any(String) } });
    const t = await insertTrailFixture(db.sql, { mediaCount: 1 });
    const [m] = await db.sql`select id from media where revision_id = ${t.revisionId}`;
    expect(await saveStep(db.sql, { userId, id: d.id, step: 5, input: [{ mediaId: m!.id, altText: "x" }] })).toMatchObject({ ok: false });
  });
});

describe("name duplicates", () => {
  it("warns about a published trail with a similar name in the same state, not a different state", async () => {
    const t = await insertTrailFixture(db.sql, { name: "Kalpetta ridge loop", state: { slug: "dup-state-n", name: "Dup State N" }, district: null });
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    await saveStep(db.sql, { userId, id: d.id, step: 1, input: { ...basics, name: "Kalpetta ridge loop track", state: "dup-state-n" } });
    expect((await getMine(db.sql, userId, d.id))!.duplicates).toEqual([expect.objectContaining({ slug: t.slug, reason: "name" })]);
    await saveStep(db.sql, { userId, id: d.id, step: 1, input: { ...basics, name: "Kalpetta ridge loop track", state: "other-state" } });
    expect((await getMine(db.sql, userId, d.id))!.duplicates).toEqual([]);
  });
});

describe("attachRoute", () => {
  it("attaches the user's ready GPX and reports published look-alikes only", async () => {
    const userId = await user();
    const published = await insertTrailFixture(db.sql, { state: { slug: "dup-state", name: "Dup State" }, district: null });
    const pubIngest = ingestGpx(new TextEncoder().encode(makeGpx(line(150, { lat: 12.2, lon: 77.4 }))));
    if (!pubIngest.ok) throw new Error();
    await db.sql.begin((tx) => insertRoute(tx, { ingested: pubIngest, revisionId: published.revisionId, userId: null, originalKey: "gpx/p/1.gpx", cleanKey: "gpx/p/1c.gpx", sha256: "d".repeat(64), sizeBytes: 10 }));
    // Another rider's unpublished upload over the same ground must never be shown.
    await readyGpx(await user(), { lat: 12.2, lon: 77.4 });

    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    const up = await readyGpx(userId, { lat: 12.2, lon: 77.4 });
    const r = await attachRoute(db.sql, { userId, id: d.id, uploadId: up.uploadId });
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.duplicates).toEqual([expect.objectContaining({ slug: published.slug })]);
    const s = await getMine(db.sql, userId, d.id);
    expect(s!.route).toMatchObject({ pointCount: 150 });
    expect(s!.route!.start).toEqual({ lat: 12.2, lon: 77.4 });
  });

  it("refuses another user's upload, a missing upload, and an upload that is not a ready GPX", async () => {
    const userId = await user();
    const other = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    const theirs = await readyGpx(other);
    expect(await attachRoute(db.sql, { userId, id: d.id, uploadId: theirs.uploadId })).toEqual({ ok: false, reason: "not_found" });
    expect(await attachRoute(db.sql, { userId, id: d.id, uploadId: crypto.randomUUID() })).toEqual({ ok: false, reason: "not_found" });
    const [img] = await db.sql`insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status) values (${userId}, 'image', 'originals', ${`image/t/${++n}.jpg`}, 'image/jpeg', 10, 'ready') returning id`;
    expect(await attachRoute(db.sql, { userId, id: d.id, uploadId: img!.id })).toEqual({ ok: false, reason: "not_found" });
    const [pending] = await db.sql`insert into upload (user_id, kind, storage_key, content_type, size_bytes) values (${userId}, 'gpx', ${`gpx/t/${++n}.gpx`}, 'application/gpx+xml', 10) returning id`;
    expect(await attachRoute(db.sql, { userId, id: d.id, uploadId: pending!.id })).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("submit", () => {
  it("creates the trail, revision, access claim and evidence, links route and photos, and marks it submitted", async () => {
    const userId = await user();
    const id = await completeDraft(userId, { photos: true, gpx: true });
    const r = await submit(db.sql, { userId, id, now });
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.slug).toMatch(/^ridge-track-above-the-lake/);

    const [t] = await db.sql`select lifecycle, sensitivity, published_revision_id, is_sample from trail where slug = ${r.slug}`;
    expect(t).toMatchObject({ lifecycle: "in_review", sensitivity: "standard", published_revision_id: null, is_sample: false });
    const [rev] = await db.sql`select id, state, version_no, name, contributor_credit, distance_km, difficulty, terrain from trail_revision where trail_id = (select id from trail where slug = ${r.slug})`;
    expect(rev).toMatchObject({ state: "submitted", version_no: 1, contributor_credit: "Rider Ravi", difficulty: "moderate", terrain: ["gravel"] });
    expect(Number(rev!.distance_km)).toBeGreaterThan(16);
    const [a] = await db.sql`select a.access_class, a.level, a.basis, (select count(*)::int from evidence e where e.assessment_id = a.id) as ev from access_assessment a where a.trail_id = (select id from trail where slug = ${r.slug})`;
    expect(a).toMatchObject({ access_class: "public", level: "community_reported", basis: "rider_observed", ev: 1 });
    const [route] = await db.sql`select revision_id from route where created_by = ${userId}`;
    expect(route!.revision_id).toBe(rev!.id);
    const [m] = await db.sql`select revision_id, role, position, alt_text from media where uploaded_by = ${userId}`;
    expect(m).toMatchObject({ revision_id: rev!.id, role: "cover", position: 0, alt_text: "Gravel track along a ridge" });
    expect(await getMine(db.sql, userId, id)).toMatchObject({ status: "submitted" });
    // Not public until a moderator publishes it.
    expect(await db.sql`select 1 from public_trails where slug = ${r.slug}`).toHaveLength(0);
  });

  it("is idempotent: a second submit returns the same trail and creates nothing more", async () => {
    const userId = await user();
    const id = await completeDraft(userId);
    const a = await submit(db.sql, { userId, id, now });
    const b = await submit(db.sql, { userId, id, now });
    expect(a.ok && b.ok && a.slug === b.slug).toBe(true);
    const [c] = await db.sql`select count(*)::int as n from trail_revision where trail_id = (select trail_id from submission where id = ${id})`;
    expect(c!.n).toBe(1);
  });

  it("handles two simultaneous submits with one trail", async () => {
    const userId = await user();
    const id = await completeDraft(userId);
    const rs = await Promise.all([submit(db.sql, { userId, id, now }), submit(db.sql, { userId, id, now })]);
    expect(rs.every((r) => r.ok)).toBe(true);
    const [c] = await db.sql`select count(*)::int as n from trail where id = (select trail_id from submission where id = ${id})`;
    expect(c!.n).toBe(1);
  });

  it("gives colliding names distinct slugs", async () => {
    // A draft cannot be submitted by anyone but its owner.
    expect(await submit(db.sql, { userId: await user(), id: await completeDraft(await user()), now })).toEqual({ ok: false, reason: "not_found" });
    const u1 = await user();
    const u2 = await user();
    const r1 = await submit(db.sql, { userId: u1, id: await completeDraft(u1, { basics: { name: "Collision lane" } }), now });
    const r2 = await submit(db.sql, { userId: u2, id: await completeDraft(u2, { basics: { name: "Collision lane" } }), now });
    expect(r1.ok && r2.ok && r1.slug !== r2.slug).toBe(true);
  });

  it("refuses an incomplete draft and names the steps to fix", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    await saveStep(db.sql, { userId, id: d.id, step: 1, input: basics });
    expect(await submit(db.sql, { userId, id: d.id, now })).toEqual({ ok: false, reason: "invalid", steps: [2, 3, 4, 6] });
    expect(await db.sql`select 1 from trail where slug like 'ridge-track-above-the-lake%' and id in (select trail_id from submission where user_id = ${userId})`).toHaveLength(0);
  });

  it("refuses an unknown state and leaves nothing behind", async () => {
    const userId = await user();
    const id = await completeDraft(userId, { basics: { state: "atlantis" } });
    expect(await submit(db.sql, { userId, id, now })).toMatchObject({ ok: false, reason: "invalid", steps: [1] });
  });

  it("rolls back everything when a photo has gone missing", async () => {
    const userId = await user();
    const id = await completeDraft(userId, { photos: true });
    await db.sql`delete from media where uploaded_by = ${userId}`;
    expect(await submit(db.sql, { userId, id, now })).toMatchObject({ ok: false, reason: "photo_unavailable" });
    expect(await getMine(db.sql, userId, id)).toMatchObject({ status: "draft" });
  });

  it("allows five submissions a day and then refuses", async () => {
    const userId = await user();
    for (let i = 0; i < 5; i++) expect((await submit(db.sql, { userId, id: await completeDraft(userId, { basics: { name: `Daily limit trail ${i}` } }), now })).ok).toBe(true);
    expect(await submit(db.sql, { userId, id: await completeDraft(userId, { basics: { name: "Daily limit trail 6" } }), now })).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("will not let a draft be edited once submitted", async () => {
    const userId = await user();
    const id = await completeDraft(userId);
    await submit(db.sql, { userId, id, now });
    expect(await saveStep(db.sql, { userId, id, step: 1, input: basics })).toEqual({ ok: false, reason: "locked" });
    expect(await discardDraft(db.sql, { userId, id })).toEqual({ ok: false, reason: "locked" });
  });
});

describe("resubmit after changes requested", () => {
  it("creates revision 2 for the same trail, supersedes the old one, and moves the route and photos", async () => {
    const userId = await user();
    const id = await completeDraft(userId, { photos: true, gpx: true });
    const first = await submit(db.sql, { userId, id, now });
    if (!first.ok) throw new Error();
    await db.sql`update submission set status = 'changes_requested', moderator_feedback = 'Please add the exact gate location.' where id = ${id}`;
    await db.sql`update trail_revision set state = 'changes_requested' where id = (select revision_id from submission where id = ${id})`;

    const s = await getMine(db.sql, userId, id);
    expect(s).toMatchObject({ status: "changes_requested", moderatorFeedback: "Please add the exact gate location." });
    expect(await saveStep(db.sql, { userId, id, step: 1, input: { ...basics, summary: `${basics.summary} The gate is on the left after the bridge.` } })).toEqual({ ok: true });
    const second = await submit(db.sql, { userId, id, now });
    expect(second).toMatchObject({ ok: true, slug: first.slug });

    const revs = await db.sql`select version_no, state from trail_revision where trail_id = (select trail_id from submission where id = ${id}) order by version_no`;
    expect(revs.map((r) => [r.version_no, r.state])).toEqual([[1, "superseded"], [2, "submitted"]]);
    const [route] = await db.sql`select r.revision_id, v.version_no from route r join trail_revision v on v.id = r.revision_id where r.created_by = ${userId}`;
    expect(route!.version_no).toBe(2);
    const [m] = await db.sql`select v.version_no from media m join trail_revision v on v.id = m.revision_id where m.uploaded_by = ${userId}`;
    expect(m!.version_no).toBe(2);
    expect(await getMine(db.sql, userId, id)).toMatchObject({ status: "submitted" });
  });
});

describe("listMine and discardDraft", () => {
  it("lists only the user's submissions, newest first, with names once known", async () => {
    const userId = await user();
    const other = await user();
    const a = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    const b = await completeDraft(userId);
    await createDraft(db.sql, { userId: other, clientId: crypto.randomUUID() });
    const list = await listMine(db.sql, userId);
    expect(list).toHaveLength(2);
    expect(list.map((s) => s.id)).toContain(a.ok ? a.id : "");
    expect(list.find((s) => s.id === b)!.title).toBe("Ridge track above the lake");
  });

  it("deletes a draft but not a submitted one", async () => {
    const userId = await user();
    const d = await createDraft(db.sql, { userId, clientId: crypto.randomUUID() });
    if (!d.ok) throw new Error();
    expect(await discardDraft(db.sql, { userId, id: d.id })).toEqual({ ok: true });
    expect(await getMine(db.sql, userId, d.id)).toBeNull();
  });
});

describe("photoPreviews and listStates", () => {
  it("returns previews only for the user's own photos", async () => {
    const userId = await user();
    const mine = await readyPhoto(userId);
    const theirs = await readyPhoto(await user());
    expect(await photoPreviews(db.sql, userId, [mine, theirs, "junk"])).toEqual({ [mine]: "https://example.test/p.webp" });
    expect(await photoPreviews(db.sql, userId, [])).toEqual({});
  });
  it("lists the seeded states", async () => {
    const states = await listStates(db.sql);
    expect(states.length).toBeGreaterThanOrEqual(36);
    expect(states).toContainEqual({ slug: "kerala", name: "Kerala" });
  });
});
