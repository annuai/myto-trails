import { randomUUID } from "node:crypto";
import { SYNC_LIMITS, decideSync, forkId, type SyncKind } from "@moto-trails/domain";
import type { Sql, TransactionSql } from "postgres";
import { buildObjectKey } from "../storage/keys";
import type { StorageProvider } from "../storage";

type Db = Sql | TransactionSql;

export type SyncChange = { kind: SyncKind; id: string; data: Record<string, unknown>; updatedAt: Date; baseUpdatedAt: Date | null; deleted: boolean };
export type PushResult = {
  accepted: { kind: SyncKind; id: string }[];
  /** A ride edited on two phones from the same start: the second was kept as `copyId`. */
  conflicts: { kind: SyncKind; id: string; copyId: string }[];
  /** The server has a newer copy; the phone should pull. */
  stale: { kind: SyncKind; id: string }[];
  /** Refused because the rider is at the ride limit. */
  overQuota: { kind: SyncKind; id: string }[];
};
export type PulledChange = { kind: SyncKind; id: string; data: Record<string, unknown>; updatedAt: string; deleted: boolean; hasTrack: boolean };

const ms = (d: Date) => d.getTime();

/** Applies a phone's queued changes. One transaction, and the rider's rows are locked first, so two pushes cannot both pass the ride limit. */
export async function pushChanges(sql: Sql, storage: StorageProvider, i: { userId: string; deviceId: string; changes: SyncChange[] }): Promise<PushResult> {
  const removeKeys: string[] = [];
  const result = await sql.begin(async (tx): Promise<PushResult> => {
    await tx`select id from app_user where id = ${i.userId} for update`;
    await tx`insert into sync_device (user_id, device_id) values (${i.userId}, ${i.deviceId}) on conflict (user_id, device_id) do nothing`;
    const out: PushResult = { accepted: [], conflicts: [], stale: [], overQuota: [] };
    const [{ rides }] = await tx<{ rides: number }[]>`select count(*)::int as rides from sync_record where user_id = ${i.userId} and kind = 'ride' and deleted_at is null`;
    let rideCount = rides;

    for (const c of i.changes) {
      const [row] = await tx<{ updated_at: Date; origin_device: string; deleted_at: Date | null; track_key: string | null }[]>`
        select updated_at, origin_device, deleted_at, track_key from sync_record where user_id = ${i.userId} and kind = ${c.kind} and id = ${c.id}`;
      const decision = decideSync(c.kind, row ? { updatedAt: ms(row.updated_at), originDevice: row.origin_device, deleted: row.deleted_at !== null } : null,
        { updatedAt: ms(c.updatedAt), deviceId: i.deviceId, baseUpdatedAt: c.baseUpdatedAt ? ms(c.baseUpdatedAt) : null, deleted: c.deleted });
      const ref = { kind: c.kind, id: c.id };

      if (decision === "stale") { out.stale.push(ref); continue; }

      // A new live ride (or one coming back from a delete, or a fork) counts toward the limit.
      const addsRide = c.kind === "ride" && !c.deleted && (decision === "fork" || !row || row.deleted_at !== null);
      if (addsRide && rideCount >= SYNC_LIMITS.maxRides) { out.overQuota.push(ref); continue; }

      if (decision === "fork") {
        const copyId = forkId(c.id, i.deviceId);
        const name = typeof c.data.name === "string" ? c.data.name : "Ride";
        const [exists] = await tx`select 1 as x from sync_record where user_id = ${i.userId} and kind = 'ride' and id = ${copyId}`;
        if (!exists) rideCount += 1;
        await tx`
          insert into sync_record (user_id, kind, id, data, updated_at, origin_device)
          values (${i.userId}, 'ride', ${copyId}, ${tx.json({ ...c.data, name: `${name} (other phone)` } as never)}, ${c.updatedAt}, ${i.deviceId})
          on conflict (user_id, kind, id) do update set data = excluded.data, updated_at = excluded.updated_at, synced_at = clock_timestamp(), deleted_at = null`;
        out.conflicts.push({ ...ref, copyId });
        continue;
      }

      if (addsRide) rideCount += 1;
      if (c.kind === "ride" && c.deleted && row && row.deleted_at === null) rideCount -= 1;
      // A deleted ride's points are gone with it; only the small tombstone stays.
      if (c.deleted && row?.track_key) removeKeys.push(row.track_key);
      await tx`
        insert into sync_record (user_id, kind, id, data, updated_at, origin_device, deleted_at)
        values (${i.userId}, ${c.kind}, ${c.id}, ${tx.json(c.deleted ? ({} as never) : (c.data as never))}, ${c.updatedAt}, ${i.deviceId}, ${c.deleted ? c.updatedAt : null})
        on conflict (user_id, kind, id) do update set
          data = excluded.data, updated_at = excluded.updated_at, origin_device = excluded.origin_device, synced_at = clock_timestamp(),
          deleted_at = excluded.deleted_at,
          track_key = case when excluded.deleted_at is null then sync_record.track_key else null end,
          track_bytes = case when excluded.deleted_at is null then sync_record.track_bytes else 0 end`;
      out.accepted.push(ref);
    }
    return out;
  });
  // Files go after the commit: a failure leaves an unreachable object, never a record pointing at nothing.
  await Promise.allSettled(removeKeys.map((k) => storage.remove("originals", k)));
  return result;
}

/**
 * Changes from the rider's other phones. The cursor is the server's clock; rows from the 5 seconds before it are sent again
 * because a transaction that started earlier can commit later. Applying a change twice is harmless (same id, same data).
 */
export async function pullChanges(sql: Sql, i: { userId: string; deviceId: string; since: Date | null; kinds: SyncKind[]; limit: number }): Promise<{ changes: PulledChange[]; cursor: string; more: boolean }> {
  const from = i.since ? new Date(i.since.getTime() - 5000) : new Date(0);
  const rows = await sql<{ kind: SyncKind; id: string; data: Record<string, unknown>; updated_at: Date; synced_at: Date; deleted_at: Date | null; track_key: string | null }[]>`
    select kind, id, data, updated_at, synced_at, deleted_at, track_key from sync_record
    where user_id = ${i.userId} and synced_at > ${from} and origin_device <> ${i.deviceId} and kind = any(${i.kinds})
    order by synced_at, kind, id limit ${i.limit + 1}`;
  const more = rows.length > i.limit;
  const page = more ? rows.slice(0, i.limit) : rows;
  await sql`insert into sync_device (user_id, device_id, last_pull_at) values (${i.userId}, ${i.deviceId}, now())
    on conflict (user_id, device_id) do update set last_pull_at = now()`;
  const last = page.at(-1);
  return {
    changes: page.map((r) => ({ kind: r.kind, id: r.id, data: r.data, updatedAt: r.updated_at.toISOString(), deleted: r.deleted_at !== null, hasTrack: r.track_key !== null })),
    // With nothing new, hand back the old cursor so an idle phone does not move it forward past a slow commit.
    cursor: (last ? last.synced_at : (i.since ?? new Date(0))).toISOString(),
    more,
  };
}

export type TrackResult = { ok: true } | { ok: false; reason: "no_such_ride" | "too_large" | "over_quota" };

/** Stores a ride's compressed points. The record must already exist (the phone pushes it first). */
export async function putTrack(sql: Sql, storage: StorageProvider, i: { userId: string; rideId: string; bytes: Uint8Array }): Promise<TrackResult> {
  if (i.bytes.byteLength === 0 || i.bytes.byteLength > SYNC_LIMITS.maxTrackBytes) return { ok: false, reason: "too_large" };
  const key = buildObjectKey({ kind: "track", ownerId: i.userId, objectId: randomUUID(), ext: "bin" });
  const prev = await sql.begin(async (tx) => {
    await tx`select id from app_user where id = ${i.userId} for update`;
    const [row] = await tx<{ track_key: string | null; track_bytes: number }[]>`select track_key, track_bytes from sync_record where user_id = ${i.userId} and kind = 'ride' and id = ${i.rideId} and deleted_at is null`;
    if (!row) return "no_such_ride" as const;
    const [{ total }] = await tx<{ total: number }[]>`select coalesce(sum(track_bytes), 0)::bigint::float8 as total from sync_record where user_id = ${i.userId}`;
    if (total - row.track_bytes + i.bytes.byteLength > SYNC_LIMITS.maxTrackTotalBytes) return "over_quota" as const;
    // Write the object before pointing the row at it, inside the lock, so a row never names a missing file.
    await storage.put("originals", key, i.bytes, "application/octet-stream");
    await tx`update sync_record set track_key = ${key}, track_bytes = ${i.bytes.byteLength}, synced_at = clock_timestamp()
      where user_id = ${i.userId} and kind = 'ride' and id = ${i.rideId}`;
    return row.track_key;
  });
  if (prev === "no_such_ride" || prev === "over_quota") return { ok: false, reason: prev };
  if (prev) await storage.remove("originals", prev).catch(() => undefined);
  return { ok: true };
}

export async function getTrack(sql: Db, storage: StorageProvider, i: { userId: string; rideId: string }): Promise<Uint8Array | null> {
  const [row] = await sql<{ track_key: string | null }[]>`select track_key from sync_record where user_id = ${i.userId} and kind = 'ride' and id = ${i.rideId} and deleted_at is null`;
  return row?.track_key ? storage.get("originals", row.track_key) : null;
}

export type SyncUsage = { rides: number; trackBytes: number; maxRides: number; maxTrackBytes: number };
export async function getUsage(sql: Db, userId: string): Promise<SyncUsage> {
  const [r] = await sql<{ rides: number; bytes: number }[]>`
    select count(*) filter (where kind = 'ride' and deleted_at is null)::int as rides, coalesce(sum(track_bytes), 0)::bigint::float8 as bytes
    from sync_record where user_id = ${userId}`;
  return { rides: r?.rides ?? 0, trackBytes: Number(r?.bytes ?? 0), maxRides: SYNC_LIMITS.maxRides, maxTrackBytes: SYNC_LIMITS.maxTrackTotalBytes };
}

/** "Delete my cloud copy": removes every synced record and track of this rider (the phones keep their own data). */
export async function eraseSyncData(sql: Sql, storage: StorageProvider, userId: string): Promise<void> {
  const rows = await sql<{ track_key: string }[]>`delete from sync_record where user_id = ${userId} returning track_key`;
  await sql`delete from sync_device where user_id = ${userId}`;
  await Promise.allSettled(rows.filter((r) => r.track_key).map((r) => storage.remove("originals", r.track_key)));
}

/** Keys of a rider's tracks, for account deletion (the rows themselves go with the account). */
export async function trackKeys(sql: Db, userId: string): Promise<string[]> {
  const rows = await sql<{ track_key: string }[]>`select track_key from sync_record where user_id = ${userId} and track_key is not null`;
  return rows.map((r) => r.track_key);
}
