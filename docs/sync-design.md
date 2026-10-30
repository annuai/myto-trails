# Sync design (not built)

Status: design only. Phase 5 of the Rider OS plan. It is not built because it needs new server tables and conflict handling that can only be tested against a real Postgres (the project tests against Supabase), and a sync that is mostly right loses riders' data. Build it with a test project available.

## Goal

A rider signs in on a second phone and sees their rides, trips, to-dos and moment notes; a lost phone does not lose a ride. Recording and everything else keep working with no network (local-first). Media stays on the phone until the rider opts in.

## What syncs, and what does not

| Syncs | Stays on the phone (first version) |
|---|---|
| Rides (track, stats, waypoints, `groupId`, `checkinId`) | Photos and voice files |
| Trips, days, stops | Documents, licence, vehicle, medical card |
| To-dos | Backup passphrase and tokens |
| Moment metadata (text, kind, time, place, `rideId`) | |

Medical and document data stay local because the server stores emergency details unencrypted today (audit finding P5); do not widen that.

## Tables (additive migration, `0028_sync.sql`)

All keyed by `(user_id, id)` where `id` is the id the phone already uses (`rideId` from Phase 1), so no id translation is needed.

- `sync_ride(user_id, id, data jsonb, updated_at, deleted_at)`: `data` holds the ride without its raw points; the points go in object storage (R2) as one compressed object per ride, `track/<user>/<ride>`, and the row keeps only that key and a size (see the free-tier numbers).
- `sync_trip`, `sync_todo`, `sync_moment`: same shape.
- `sync_device(user_id, device_id, last_pull_at)`.
- Row level security stays "no policies"; the API filters by `user_id`, as every other table does.

## API (extends `/api/v1`, scope `sync`)

- `POST /sync/push` with `{ deviceId, changes: [{ kind, id, data, updatedAt, deleted? }] }`, at most 200 per call. Returns what was accepted and any conflicts.
- `GET /sync/pull?since=<server time>&kinds=...` returns changes made on other devices.
- A new scope `sync`; tokens made for the app get it. Rate limit per token like the other writes.

## Conflicts

- Per record, last writer wins on `updatedAt`, **except** a completed ride that was edited on two devices: keep both, name the second "(other phone)", and tell the rider. A ride is a record of something that happened; silently overwriting it is the one outcome to avoid.
- Deletes are soft (`deleted_at`) for 30 days so a deletion on one phone does not resurrect from another.

## Phone side

- A persisted outbox (the condition-report outbox is the pattern), flushed on foreground and every few minutes while online, with backoff.
- A visible "waiting to sync: 3" in Profile, not a spinner.
- First sync is opt-in with plain wording; the Profile disclaimer "stays on this device" changes at the same time.
- Pull applies changes through the same stores; `rideId` makes it idempotent.

## Free-tier numbers (check before building)

- A 3-hour ride at 1 point per second is about 10,800 points. At roughly 12 bytes per point after delta encoding and compression that is about 130 KB; budget 200 KB per ride.
- Supabase free is 500 MB of database. At 200 KB per ride that is 2,500 rides in total across all riders, which is small: tracks belong in object storage (R2), not Postgres. Hence the pointer design above.
- Set a per-rider quota (suggest 100 rides or 50 MB, whichever first) and say so in the app.

## Retention

Soft-deleted rows purged after 30 days; `sync_device` rows after 90 days idle; everything for a rider removed by the existing account deletion (extend `account/delete.ts`).

## Not decided

Whether to ship sync before or after the public launch, and the quota numbers. Both need the owner.
