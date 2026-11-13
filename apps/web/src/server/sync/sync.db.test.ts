// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SYNC_LIMITS } from "@moto-trails/domain";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { deleteAccount } from "../account/delete";
import { purgeRetention } from "../retention/purge";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { eraseSyncData, getTrack, getUsage, pullChanges, pushChanges, putTrack, type SyncChange } from "./sync";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const A = "phone-aaaa-1111";
const B = "phone-bbbb-2222";
const t = (s: number) => new Date(Date.UTC(2026, 10, 12, 9, 0, s));
const ride = (id: string, s: number, base: number | null, name = "Ghat run"): SyncChange =>
  ({ kind: "ride", id, data: { name }, updatedAt: t(s), baseUpdatedAt: base === null ? null : t(base), deleted: false });
const del = (id: string, s: number, kind: SyncChange["kind"] = "ride"): SyncChange => ({ kind, id, data: {}, updatedAt: t(s), baseUpdatedAt: null, deleted: true });
const pull = (userId: string, deviceId: string, since: Date | null = null) => pullChanges(db.sql, { userId, deviceId, since, kinds: ["ride", "trip", "todo", "moment"], limit: 200 });

describe("sync", () => {
  it("syncs a ride from one phone to another, and a phone does not pull its own changes", async () => {
    const u = await makeUser(db.sql, { name: "Asha" }); const storage = new MemoryStorageProvider();
    const r = await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    expect(r.accepted).toEqual([{ kind: "ride", id: "r1" }]);
    expect((await pull(u, A)).changes).toHaveLength(0);
    const got = await pull(u, B);
    expect(got.changes).toEqual([expect.objectContaining({ kind: "ride", id: "r1", data: { name: "Ghat run" }, deleted: false, hasTrack: false })]);
  });

  it("is safe to repeat: a retried push changes nothing", async () => {
    const u = await makeUser(db.sql, { name: "Ben" }); const storage = new MemoryStorageProvider();
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    const again = await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    expect(again.accepted).toHaveLength(1);
    expect((await getUsage(db.sql, u)).rides).toBe(1);
  });

  it("keeps both copies of a ride edited on two phones, and names the second", async () => {
    const u = await makeUser(db.sql, { name: "Chitra" }); const storage = new MemoryStorageProvider();
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    await pushChanges(db.sql, storage, { userId: u, deviceId: B, changes: [ride("r1", 2, 1, "Edited on B")] });
    const r = await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 3, 1, "Edited on A")] });
    expect(r.conflicts).toHaveLength(1);
    const copyId = r.conflicts[0]!.copyId;
    const all = await pull(u, "phone-cccc-3333");
    expect(all.changes.find((c) => c.id === "r1")!.data).toEqual({ name: "Edited on B" });
    expect(all.changes.find((c) => c.id === copyId)!.data).toEqual({ name: "Edited on A (other phone)" });
    // A retried push does not create a third copy.
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 3, 1, "Edited on A")] });
    expect((await getUsage(db.sql, u)).rides).toBe(2);
  });

  it("uses last-writer-wins for to-dos and reports a stale write", async () => {
    const u = await makeUser(db.sql, { name: "Dev" }); const storage = new MemoryStorageProvider();
    const todo = (s: number, base: number | null, text: string): SyncChange => ({ kind: "todo", id: "t1", data: { text }, updatedAt: t(s), baseUpdatedAt: base === null ? null : t(base), deleted: false });
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [todo(1, null, "one")] });
    await pushChanges(db.sql, storage, { userId: u, deviceId: B, changes: [todo(5, 1, "five")] });
    const r = await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [todo(3, 1, "three")] });
    expect(r.stale).toEqual([{ kind: "todo", id: "t1" }]);
    expect((await pull(u, "phone-cccc-3333")).changes[0]!.data).toEqual({ text: "five" });
  });

  it("a delete reaches the other phone as a tombstone and is not undone by an older edit", async () => {
    const u = await makeUser(db.sql, { name: "Esha" }); const storage = new MemoryStorageProvider();
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [del("r1", 5)] });
    const stale = await pushChanges(db.sql, storage, { userId: u, deviceId: B, changes: [ride("r1", 3, null)] });
    expect(stale.stale).toHaveLength(1);
    expect((await pull(u, B)).changes).toEqual([expect.objectContaining({ id: "r1", deleted: true })]);
    expect((await getUsage(db.sql, u)).rides).toBe(0);
  });

  it("stops at the ride limit and counts a delete back", async () => {
    const u = await makeUser(db.sql, { name: "Farid" }); const storage = new MemoryStorageProvider();
    const many = Array.from({ length: SYNC_LIMITS.maxRides }, (_, i) => ride(`r${i}`, 1, null));
    for (let i = 0; i < many.length; i += 50) await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: many.slice(i, i + 50) });
    expect((await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("extra", 2, null)] })).overQuota).toHaveLength(1);
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [del("r0", 3)] });
    expect((await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("extra", 4, null)] })).accepted).toHaveLength(1);
  });

  it("never shows one rider another's records", async () => {
    const u1 = await makeUser(db.sql, { name: "Gita" }); const u2 = await makeUser(db.sql, { name: "Hari" }); const storage = new MemoryStorageProvider();
    await pushChanges(db.sql, storage, { userId: u1, deviceId: A, changes: [ride("r1", 1, null)] });
    expect((await pull(u2, B)).changes).toHaveLength(0);
    expect(await putTrack(db.sql, storage, { userId: u2, rideId: "r1", bytes: new Uint8Array([1]) })).toEqual({ ok: false, reason: "no_such_ride" });
    expect(await getTrack(db.sql, storage, { userId: u2, rideId: "r1" })).toBeNull();
  });

  it("stores, replaces and deletes a ride's track, and counts it against the allowance", async () => {
    const u = await makeUser(db.sql, { name: "Ila" }); const storage = new MemoryStorageProvider();
    expect(await putTrack(db.sql, storage, { userId: u, rideId: "r1", bytes: new Uint8Array([1]) })).toEqual({ ok: false, reason: "no_such_ride" });
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null)] });
    expect(await putTrack(db.sql, storage, { userId: u, rideId: "r1", bytes: new Uint8Array([1, 2, 3]) })).toEqual({ ok: true });
    expect(await putTrack(db.sql, storage, { userId: u, rideId: "r1", bytes: new Uint8Array([4, 5]) })).toEqual({ ok: true });
    expect(Array.from((await getTrack(db.sql, storage, { userId: u, rideId: "r1" }))!)).toEqual([4, 5]);
    expect((await getUsage(db.sql, u)).trackBytes).toBe(2);
    expect((await pull(u, B)).changes[0]).toMatchObject({ hasTrack: true });
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [del("r1", 5)] });
    expect(await getTrack(db.sql, storage, { userId: u, rideId: "r1" })).toBeNull();
    expect((await getUsage(db.sql, u)).trackBytes).toBe(0);
  });

  it("erases the cloud copy on request and with the account, and the nightly purge drops old tombstones", async () => {
    const u = await makeUser(db.sql, { name: "Jai" }); const storage = new MemoryStorageProvider();
    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r1", 1, null), ride("r2", 1, null)] });
    await putTrack(db.sql, storage, { userId: u, rideId: "r1", bytes: new Uint8Array([1]) });
    await eraseSyncData(db.sql, storage, u);
    expect((await pull(u, B)).changes).toHaveLength(0);

    await pushChanges(db.sql, storage, { userId: u, deviceId: A, changes: [ride("r3", 1, null), del("t9", 1, "todo")] });
    await putTrack(db.sql, storage, { userId: u, rideId: "r3", bytes: new Uint8Array([7]) });
    await db.sql`update sync_record set deleted_at = now() - interval '31 days' where user_id = ${u} and kind = 'todo'`;
    await purgeRetention(db.sql, storage, new Date());
    expect(await db.sql`select 1 from sync_record where user_id = ${u} and kind = 'todo'`).toHaveLength(0);
    expect(await db.sql`select 1 from sync_record where user_id = ${u} and kind = 'ride'`).toHaveLength(1);

    expect(await deleteAccount(db.sql, storage, u)).toEqual({ ok: true });
    expect(await db.sql`select 1 from sync_record where user_id = ${u}`).toHaveLength(0);
    expect(await getTrack(db.sql, storage, { userId: u, rideId: "r3" })).toBeNull();
  });
});
