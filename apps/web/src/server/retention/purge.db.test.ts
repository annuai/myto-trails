// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "../storage";
import { seedRegions } from "../db/seed-regions";
import { createTestDatabase } from "../testing/db";
import { makeUser, submittedSubmission } from "../testing/submission-fixture";
import { purgeRetention, RETENTION_DAYS } from "./purge";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { db = await createTestDatabase(); await seedRegions(db.sql); });
afterAll(async () => { await db.drop(); });

const NOW = new Date("2026-11-05T03:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const remove = vi.fn(async () => {});
const storage = { remove } as unknown as StorageProvider;
let n = 0;
const id = () => `k${++n}-${crypto.randomUUID().slice(0, 8)}`;
const left = async (table: string, where: string, value: string) => (await db.sql.unsafe(`select 1 from ${table} where ${where} = $1`, [value])).length;

describe("purgeRetention", () => {
  it("removes expired sign-in tokens, sessions and rate-limit windows, and keeps current ones", async () => {
    const u = await makeUser(db.sql);
    const [old] = await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${u}, ${id()}, ${ago(RETENTION_DAYS.session + 1)}) returning id`;
    const [live] = await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${u}, ${id()}, ${new Date(NOW.getTime() + DAY)}) returning id`;
    const [oldToken] = await db.sql`insert into login_token (email, token_hash, expires_at) values ('a@example.test', ${id()}, ${ago(2)}) returning id`;
    const [liveToken] = await db.sql`insert into login_token (email, token_hash, expires_at) values ('b@example.test', ${id()}, ${new Date(NOW.getTime() + 600_000)}) returning id`;
    const oldKey = id(), liveKey = id();
    await db.sql`insert into rate_limit (key, window_start, count) values (${oldKey}, ${ago(5)}, 3), (${liveKey}, ${ago(0)}, 1)`;
    const r = await purgeRetention(db.sql, storage, NOW);
    expect(r.failed).toEqual([]);
    expect(await left("auth_session", "id::text", old!.id)).toBe(0);
    expect(await left("auth_session", "id::text", live!.id)).toBe(1);
    expect(await left("login_token", "id::text", oldToken!.id)).toBe(0);
    expect(await left("login_token", "id::text", liveToken!.id)).toBe(1);
    expect(await left("rate_limit", "key", oldKey)).toBe(0);
    expect(await left("rate_limit", "key", liveKey)).toBe(1);
  });

  it("removes revoked device tokens after a month, never a working one", async () => {
    const u = await makeUser(db.sql);
    const [gone] = await db.sql`insert into api_token (user_id, kind, label, token_hash, scopes, revoked_at) values (${u}, 'app_ios', 'old', ${id()}, ${["saved"]}, ${ago(31)}) returning id`;
    const [recent] = await db.sql`insert into api_token (user_id, kind, label, token_hash, scopes, revoked_at) values (${u}, 'app_ios', 'recent', ${id()}, ${["saved"]}, ${ago(5)}) returning id`;
    const [working] = await db.sql`insert into api_token (user_id, kind, label, token_hash, scopes) values (${u}, 'app_ios', 'live', ${id()}, ${["saved"]}) returning id`;
    await purgeRetention(db.sql, storage, NOW);
    expect(await left("api_token", "id::text", gone!.id)).toBe(0);
    expect(await left("api_token", "id::text", recent!.id)).toBe(1);
    expect(await left("api_token", "id::text", working!.id)).toBe(1);
  });

  it("removes check-ins three months after they ended, but not an open or recent one", async () => {
    const u = await makeUser(db.sql);
    const make = async (expectedAgo: number, arrivedAgo: number | null) => (await db.sql`
      insert into ride_checkin (user_id, token_hash, contact_name, expected_at, arrived_at)
      values (${u}, ${id()}, 'Mum', ${ago(expectedAgo)}, ${arrivedAgo === null ? null : ago(arrivedAgo)}) returning id`)[0]!.id as string;
    const old = await make(100, null), arrivedLate = await make(100, 10), recent = await make(20, null);
    await purgeRetention(db.sql, storage, NOW);
    expect(await left("ride_checkin", "id::text", old)).toBe(0);
    expect(await left("ride_checkin", "id::text", arrivedLate)).toBe(1);
    expect(await left("ride_checkin", "id::text", recent)).toBe(1);
  });

  it("removes group rides a month after the last activity, with their members, and keeps a live one", async () => {
    const leader = await makeUser(db.sql);
    const make = async (activityAgo: number, endedAgo: number | null) => {
      const [g] = await db.sql`
        insert into group_ride (code, name, leader_id, created_at, last_activity_at, ended_at)
        values (${"ABCDEF"}, 'Sunday', ${leader}, ${ago(activityAgo + 1)}, ${ago(activityAgo)}, ${endedAgo === null ? null : ago(endedAgo)}) returning id`;
      await db.sql`insert into group_ride_member (ride_id, user_id, display_name, role, lat, lng) values (${g!.id}, ${leader}, 'Leader', 'leader', 12.9, 77.6)`;
      return g!.id as string;
    };
    const old = await make(40, 40), live = await make(2, null);
    await purgeRetention(db.sql, storage, NOW);
    expect(await left("group_ride", "id::text", old)).toBe(0);
    expect(await left("group_ride_member", "ride_id::text", old)).toBe(0);
    expect(await left("group_ride", "id::text", live)).toBe(1);
  });

  it("lets go of where a condition report was filed from after 90 days, and keeps the report", async () => {
    const u = await makeUser(db.sql);
    const { trailId } = await submittedSubmission(db.sql, u);
    const file = async (reportedAgo: number) => (await db.sql`
      insert into condition_report (trail_id, user_id, client_id, kind, reported_at, lat, lng) values (${trailId}, ${u}, ${id() + "0000"}, 'clear', ${ago(reportedAgo)}, 12.9, 77.6) returning id`)[0]!.id as string;
    const old = await file(100), recent = await file(10);
    await purgeRetention(db.sql, storage, NOW);
    expect((await db.sql`select lat, lng from condition_report where id = ${old}`)[0]).toEqual({ lat: null, lng: null });
    expect((await db.sql`select lat, lng from condition_report where id = ${recent}`)[0]).toEqual({ lat: 12.9, lng: 77.6 });
  });

  it("removes drafts and rejected submissions after a year, and keeps newer ones and approved ones", async () => {
    const u = await makeUser(db.sql);
    const make = async (status: string, updatedAgo: number) => (await db.sql`
      insert into submission (user_id, client_id, status, updated_at) values (${u}, ${crypto.randomUUID()}, ${status}, ${ago(updatedAgo)}) returning id`)[0]!.id as string;
    const oldDraft = await make("draft", 400), newDraft = await make("draft", 100), oldRejected = await make("rejected", 400), oldApproved = await make("approved", 800);
    await purgeRetention(db.sql, storage, NOW);
    expect(await left("submission", "id::text", oldDraft)).toBe(0);
    expect(await left("submission", "id::text", newDraft)).toBe(1);
    expect(await left("submission", "id::text", oldRejected)).toBe(0);
    expect(await left("submission", "id::text", oldApproved)).toBe(1);
  });

  it("removes rejected and never-finished uploads with their stored files, and keeps a fresh or finished one", async () => {
    remove.mockClear();
    const u = await makeUser(db.sql);
    const make = async (status: string, createdAgo: number) => {
      const key = `gpx/${u}/${crypto.randomUUID()}.gpx`;
      const [r] = await db.sql`
        insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status, created_at, processed_at)
        values (${u}, 'gpx', 'quarantine', ${key}, 'application/gpx+xml', 100, ${status}, ${ago(createdAgo)}, ${ago(createdAgo)}) returning id`;
      return { id: r!.id as string, key };
    };
    const rejected = await make("rejected", 40), stuck = await make("pending", 10), fresh = await make("pending", 1), recentRejected = await make("rejected", 5);
    const res = await purgeRetention(db.sql, storage, NOW);
    expect(await left("upload", "id::text", rejected.id)).toBe(0);
    expect(await left("upload", "id::text", stuck.id)).toBe(0);
    expect(await left("upload", "id::text", fresh.id)).toBe(1);
    expect(await left("upload", "id::text", recentRejected.id)).toBe(1);
    expect(remove).toHaveBeenCalledWith("quarantine", rejected.key);
    expect(remove).toHaveBeenCalledWith("quarantine", stuck.key);
    expect(remove).not.toHaveBeenCalledWith("quarantine", fresh.key);
    expect(res.filesRemoved).toBeGreaterThanOrEqual(2);
  });

  it("removes an unattached file from a year-old draft, but not one a live draft still names", async () => {
    remove.mockClear();
    const u = await makeUser(db.sql);
    const make = async () => {
      const key = `image/${u}/${crypto.randomUUID()}.jpg`;
      const [r] = await db.sql`
        insert into upload (user_id, kind, bucket, storage_key, content_type, size_bytes, status, created_at)
        values (${u}, 'image', 'quarantine', ${key}, 'image/jpeg', 100, 'ready', ${ago(400)}) returning id`;
      return { id: r!.id as string, key };
    };
    const abandoned = await make(), named = await make();
    await db.sql`insert into submission (user_id, client_id, status, data, updated_at) values (${u}, ${crypto.randomUUID()}, 'draft', ${db.sql.json({ photos: [named.id] })}, ${ago(10)})`;
    await purgeRetention(db.sql, storage, NOW);
    expect(await left("upload", "id::text", abandoned.id)).toBe(0);
    expect(await left("upload", "id::text", named.id)).toBe(1);
    expect(remove).toHaveBeenCalledWith("quarantine", abandoned.key);
    expect(remove).not.toHaveBeenCalledWith("quarantine", named.key);
  });

  it("changes nothing in a dry run, and reports what a real run would remove", async () => {
    remove.mockClear();
    const u = await makeUser(db.sql);
    const [s] = await db.sql`insert into auth_session (user_id, token_hash, expires_at) values (${u}, ${id()}, ${ago(30)}) returning id`;
    const r = await purgeRetention(db.sql, storage, NOW, { dryRun: true });
    expect(r.purged.sessions).toBeGreaterThanOrEqual(1);
    expect(await left("auth_session", "id::text", s!.id)).toBe(1);
    expect(remove).not.toHaveBeenCalled();
  });

  it("finds nothing left to do on a second run", async () => {
    await purgeRetention(db.sql, storage, NOW);
    const r = await purgeRetention(db.sql, storage, NOW);
    expect(r.failed).toEqual([]);
    expect(Object.values(r.purged).every((x) => x === 0)).toBe(true);
  });
});
