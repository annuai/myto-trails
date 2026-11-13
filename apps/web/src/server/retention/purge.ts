import type { Sql, TransactionSql } from "postgres";
import { publicVariantKeys } from "../account/delete";
import { photoCopyKeys } from "../community/photo-shared";
import type { StorageBucket, StorageProvider } from "../storage";

type Db = Sql | TransactionSql;

const DAY_MS = 86_400_000;

/**
 * How long each kind of data is kept, in days. docs/11 sets the privacy ones (drafts and rejected submissions 12 months,
 * unsubmitted recordings 12 months); the rest are short grace periods for things that are useless once they have expired.
 */
export const RETENTION_DAYS = {
  loginToken: 1,
  authCode: 1,
  session: 7,
  rateLimitWindow: 2,
  revokedToken: 30,
  checkin: 90,
  groupRide: 30,
  conditionPosition: 90,
  deadUpload: 30,
  stuckUpload: 7,
  draft: 365,
  rejectedSubmission: 365,
  abandonedFile: 365,
  orphanPhoto: 1,
  /** Soft-deleted synced records: long enough that a phone that was off for a month still learns of the delete. SYNC_LIMITS.tombstoneDays. */
  syncTombstone: 30,
  syncDeviceIdle: 90,
} as const;

/** Most files removed in one run, so a backlog is cleared over a few nights instead of in one request that times out. */
export const FILE_BATCH = 200;

const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

type Doomed = { bucket: StorageBucket; key: string };

/** A rule deletes or clears rows and says how many; it may also list stored files to remove once the database change has committed. */
type Rule = { name: string; run: (db: Db, now: Date, doomed: Doomed[]) => Promise<number> };

const count = (rows: { length: number }) => rows.length;

const rules: Rule[] = [
  { name: "loginTokens", run: async (db, now) => count(await db`delete from login_token where expires_at < ${ago(now, RETENTION_DAYS.loginToken)} returning id`) },
  { name: "appAuthCodes", run: async (db, now) => count(await db`delete from app_auth_code where expires_at < ${ago(now, RETENTION_DAYS.authCode)} returning id`) },
  { name: "sessions", run: async (db, now) => count(await db`delete from auth_session where expires_at < ${ago(now, RETENTION_DAYS.session)} returning id`) },
  { name: "rateLimitWindows", run: async (db, now) => count(await db`delete from rate_limit where window_start < ${ago(now, RETENTION_DAYS.rateLimitWindow)} returning key`) },
  { name: "revokedTokens", run: async (db, now) => count(await db`delete from api_token where revoked_at < ${ago(now, RETENTION_DAYS.revokedToken)} returning id`) },
  {
    // The position and emergency details are already wiped a day after a check-in ends; what is left is the contact's name and email.
    name: "checkins",
    run: async (db, now) => count(await db`
      delete from ride_checkin
      where greatest(expected_at, coalesce(arrived_at, expected_at)) < ${ago(now, RETENTION_DAYS.checkin)}
      returning id`),
  },
  {
    // Members go with the ride (on delete cascade), and with them the last position each shared.
    name: "groupRides",
    run: async (db, now) => count(await db`
      delete from group_ride
      where last_activity_at < ${ago(now, RETENTION_DAYS.groupRide)} and (ended_at is null or ended_at < ${ago(now, RETENTION_DAYS.groupRide)})
      returning id`),
  },
  {
    // The report stays (it is about the trail); only where the rider stood when they filed it is let go.
    name: "conditionPositions",
    run: async (db, now) => count(await db`
      update condition_report set lat = null, lng = null
      where (lat is not null or lng is not null) and reported_at < ${ago(now, RETENTION_DAYS.conditionPosition)}
      returning id`),
  },
  {
    // A deleted ride's track is already removed when the delete arrives; only the small tombstone row is left.
    name: "syncTombstones",
    run: async (db, now) => count(await db`delete from sync_record where deleted_at < ${ago(now, RETENTION_DAYS.syncTombstone)} returning id`),
  },
  {
    name: "syncDevices",
    run: async (db, now) => count(await db`delete from sync_device where last_pull_at < ${ago(now, RETENTION_DAYS.syncDeviceIdle)} returning device_id`),
  },
  {
    name: "draftSubmissions",
    run: async (db, now) => count(await db`delete from submission where status = 'draft' and updated_at < ${ago(now, RETENTION_DAYS.draft)} returning id`),
  },
  {
    name: "rejectedSubmissions",
    run: async (db, now) => count(await db`
      delete from submission where status in ('rejected', 'withdrawn') and updated_at < ${ago(now, RETENTION_DAYS.rejectedSubmission)} returning id`),
  },
  {
    // Files that were turned down, removed, or never finished uploading. They belong to no media or route row.
    name: "deadUploads",
    run: async (db, now, doomed) => {
      const rows = await db`
        delete from upload where id in (
          select id from upload
          where media_id is null and route_id is null
            and ((status in ('rejected', 'removed') and coalesce(processed_at, created_at) < ${ago(now, RETENTION_DAYS.deadUpload)})
              or (status = 'pending' and created_at < ${ago(now, RETENTION_DAYS.stuckUpload)}))
          order by created_at limit ${FILE_BATCH})
        returning bucket, storage_key`;
      for (const r of rows) doomed.push({ bucket: r.bucket as StorageBucket, key: r.storage_key as string });
      return rows.length;
    },
  },
  {
    // A club photo whose post is gone (removed, or never finished posting) is a file nobody can reach through the app: it goes, with its three copies.
    name: "orphanPhotos",
    run: async (db, now, doomed) => {
      const rows = await db`
        delete from asset where id in (
          select a.id from asset a where a.created_at < ${ago(now, RETENTION_DAYS.orphanPhoto)} and not exists (select 1 from post_media m where m.asset_id = a.id)
          order by a.created_at limit ${FILE_BATCH})
        returning stem`;
      for (const r of rows) for (const key of photoCopyKeys(r.stem as string)) doomed.push({ bucket: "public", key });
      return rows.length;
    },
  },
  {
    // Photos and tracks from drafts that were never published or were dropped, a year on. Anything on a published trail, a profile
    // picture, a bike photo, a club or event cover or a condition report is left alone, and so is any file a draft that is still alive names.
    name: "abandonedFiles",
    run: async (db, now, doomed) => {
      const rows = await db`
        select up.id, up.bucket, up.storage_key, up.media_id, up.route_id, m.variants, m.variants_avif
        from upload up
        left join media m on m.id = up.media_id
        left join route r on r.id = up.route_id
        where up.created_at < ${ago(now, RETENTION_DAYS.abandonedFile)}
          and up.status in ('ready', 'processing')
          and (m.id is null or m.revision_id is null)
          and (r.id is null or r.revision_id is null)
          and (m.id is null or not (
            exists (select 1 from app_user u where u.avatar_media_id = m.id)
            or exists (select 1 from club c where c.cover_media_id = m.id)
            or exists (select 1 from rider_bike b where b.photo_media_id = m.id)
            or exists (select 1 from ride_event e where e.cover_media_id = m.id)
            or exists (select 1 from condition_report cr where cr.media_id = m.id)))
          and not exists (select 1 from submission s where s.data::text like '%' || up.id::text || '%' or s.route_upload_id = up.id)
        order by up.created_at limit ${FILE_BATCH}`;
      if (rows.length === 0) return 0;
      const mediaIds = rows.map((r) => r.media_id as string | null).filter((x): x is string => !!x);
      const routeIds = rows.map((r) => r.route_id as string | null).filter((x): x is string => !!x);
      for (const up of rows) {
        doomed.push({ bucket: up.bucket as StorageBucket, key: up.storage_key as string });
        for (const key of publicVariantKeys(up.id as string, (up.variants ?? {}) as Record<string, unknown>, (up.variants_avif ?? {}) as Record<string, unknown>)) {
          doomed.push({ bucket: "public", key });
        }
      }
      if (mediaIds.length) await db`delete from media where id in ${db(mediaIds)} and revision_id is null`;
      if (routeIds.length) await db`delete from route where id in ${db(routeIds)} and revision_id is null`;
      await db`delete from upload where id in ${db(rows.map((r) => r.id as string))}`;
      return rows.length;
    },
  },
];

export type PurgeResult = { purged: Record<string, number>; filesRemoved: number; failed: string[] };

class DryRun extends Error {}

/**
 * Deletes data that has outlived its retention (RETENTION_DAYS). Each rule runs on its own, so one that fails is reported in
 * `failed` and the others still run. Stored files are removed after the database change commits: a failure there leaves an
 * unreachable file, never a row that points at nothing. With `dryRun` everything is rolled back and no file is touched, so the
 * counts say what a real run would remove.
 */
export async function purgeRetention(sql: Sql, storage: StorageProvider, now: Date, opts: { dryRun?: boolean } = {}): Promise<PurgeResult> {
  const purged: Record<string, number> = {};
  const failed: string[] = [];
  const doomed: Doomed[] = [];

  const runAll = async (db: Db) => {
    for (const rule of rules) {
      const mine: Doomed[] = [];
      try {
        // Each rule is one unit: its own transaction, or a savepoint inside the dry run's, so a statement that errors there
        // cannot poison the rules after it and a rule that changes several tables never half-applies.
        const n = "savepoint" in db ? await db.savepoint((tx) => rule.run(tx, now, mine)) : await db.begin((tx) => rule.run(tx, now, mine));
        purged[rule.name] = n;
        doomed.push(...mine);
      } catch (e) {
        failed.push(rule.name);
        console.error(`Retention purge: ${rule.name} failed`, e instanceof Error ? e.message : e);
      }
    }
  };

  if (opts.dryRun) {
    try {
      await sql.begin(async (tx) => {
        await runAll(tx);
        throw new DryRun();
      });
    } catch (e) {
      if (!(e instanceof DryRun)) throw e;
    }
    return { purged, filesRemoved: 0, failed };
  }

  await runAll(sql);
  const outcomes = await Promise.allSettled(doomed.map((d) => storage.remove(d.bucket, d.key)));
  const lost = outcomes.filter((o) => o.status === "rejected").length;
  if (lost > 0) console.error(`Retention purge: ${lost} of ${doomed.length} stored files could not be removed`);
  return { purged, filesRemoved: doomed.length - lost, failed };
}
