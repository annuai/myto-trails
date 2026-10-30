# The Ride contract (phone app)

Status: Phase 1 of the Rider OS change ([ADR 0008](adr/0008-rider-os-change-and-reversibility.md)). Everything here is on the phone; nothing is synced to the server.

## The id

A ride gets its `rideId` **when recording starts** (`recorderCore.start`). It is written into the crash-safe journal (`meta.ride_id` in `myto-ride-journal.db`) so it survives a kill and is restored by `recover()`. When the ride is saved, it becomes `Ride.id` (`finishCore` passes it to `addRide`). A recording from before ride ids has none, and `addRide` makes one as before.

`rideKey` (the ride's `startedAt`) is **kept**. Journal entries carry both. Nothing reads `rideId` yet; the Rider OS screens will, and the old screens keep using `rideKey` until the "contract" release.

## What points at a ride today

| From | How | Direction |
|---|---|---|
| Journal entry | `rideKey` (start time) and, new, `rideId` | entry → ride |
| Trip | `trip.rideIds[]`; a finished ride joins the active trip (`attachToActive`) | trip → ride. A ride's trip is found by searching trips for its id, not stored on the ride |
| Trail submission | `ride.submission`, `ride.clientId` | ride → submission |
| Group ride, check-in | `ride.groupId`, `ride.checkinId`, noted when the ride finishes (Phase 4), because the companion ends them as soon as recording stops | ride → server group / check-in id |
| Moment's place | `entry.lat`, `entry.lng` when the phone had a fix from the last two minutes (Phase 3) | entry → place |

## Not linked yet (and where it is planned)

| Link | Phase |
|---|---|
| To-do ↔ ride (a ride's checklist) | 2 |
| Bike ↔ ride (and one bike instead of two) | 1 follow-up / 5 |
| Plan → group ride carries the trip, not just its name | 4 follow-up |
| Waypoint ↔ journal entry (a moment tied to a waypoint) | 3 follow-up |

## States

A ride has no stored status. What exists is derived: the recorder is `idle` or `running` (and `paused`); a trip is `logged | upcoming | ready | active | done | missed`; a ride is "contributed" when `ride.submission` is set. A stored `draft | planned | active | completed | contributed` status is added with the plan object in Phase 2, when something reads it.

## Existing data

On start, `runRideIdMigration` gives older journal entries the id of the ride that started at their `rideKey`. If any entry needs it, it first writes `journal-before-ride-ids-<time>.json` (the entries as they were) to the app's document folder. If that copy cannot be written, nothing is changed and the next start tries again. It does not run in the browser test build.

## Going back

`rideId` is optional on journal entries and the journal meta, and the SQLite column is added only if missing, so the 0.8 app (`legacy/0.8-companion`) should read this data unchanged: it ignores the extra field and column. This is from reading the code; it has not been tested by opening this data in a 0.8 build.
