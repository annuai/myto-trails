# Rides, recording, caching, clubs: architecture

Status: **draft for approval. Nothing is built.** Scope is `apps/mobile`, plus a small API addition in `apps/web`.

## 1. What you asked for

1. The ride card shows no GPS line.
2. Tapping a ride opens a map you can look around in, with "Open in Google Maps" that launches the Google Maps app.
3. GPX recording lost part of a 6 km ride. Find why, and make it work in every case.
4. Tapping the latest ride card opens the ride story.
5. A cache so the app does not call the API for everything: keep opened trails, evict when full, check for updates cheaply.
6. Submit a trail, create a club, and join a club as real in-app features.
7. Recommendations for what else to build.
8. Everything uses the existing design system. No new components unless unavoidable. Audit against best-in-class UI.

**Non-goals:** a new design language, a new backend, turn-by-turn navigation, a social feed.
**Anti-goals:** a recorder that looks fine but still drops data; a cache that shows stale trail *safety status* as if it were current; new one-off components.

## 2. Findings (from reading the code)

### 2.1 Why the 6 km ride was incomplete: the recorder is foreground-only and memory-only

| # | Cause | Evidence | Effect |
|---|-------|----------|--------|
| 1 | No background location | `lib/location.ts` uses `watchPositionAsync` only. `app.json` requests only `locationWhenInUsePermission`, with no background mode and no background task | iOS suspends the app when the screen locks or you switch to Google Maps. Fixes stop arriving, so the track has a hole. Switching to a navigation app is the normal way to ride, so this is the most likely cause |
| 2 | Points live only in memory | `store/recorder.ts` is not persisted. `finishRide` is the only write | Crash, OS kill, reload or a dev rebuild loses the whole ride |
| 3 | Fixes dropped silently at capture | `RecorderHost` drops accuracy over 80 m. `addPoint` drops steps under 3 m | Poor GPS in trees, canyons or under a visor leaves holes with no record that anything was dropped. Dropped data cannot be recovered later |
| 4 | Gaps are invisible | One `trkseg` for the whole ride. Duration is wall-clock | A 2 km hole becomes a straight line. Stats and GPX are wrong without any warning |
| 5 | No live health signal | Live screen shows a point count only | You find out after the ride |
| 6 | Web cannot background at all | Browser geolocation stops in a hidden tab | Web is best-effort only |

I have not yet reproduced the 6 km loss on a device. Causes 1 and 2 explain it by the code alone, but the build includes a device test (section 3.2) so we confirm rather than assume.

### 2.2 Why the ride card line may be missing: unproven, reproduce first

`RideMap` wraps `OsmMap` in `pointerEvents="none"` and mounts it after a timeout. The web `OsmMap` path reads correctly. The native `OsmMap.tsx` is labelled **"NOT yet run on a device"**, and I suspect that path. I will not guess a fix. **Step 0 is to reproduce it on the platform you use**, read the console or native log, then fix the real cause. The `RouteArt` fallback already exists, so a failed map should at least show the drawn route, which also suggests a data or mount problem rather than a styling one.

### 2.3 Other things found

- Home "Your latest ride" card is inert. A separate "View ride story" button does the navigation.
- `useFetch` has a memory cache only. It is wiped on app restart, never evicted, and has no freshness rules. `useTrailStore.offline` is a manual download pack and is unrelated to it.
- API has no ETag, `Cache-Control` or "changed since" endpoint.
- Clubs: `GET /clubs`, `GET /clubs/{id}` and the cover `PUT` exist in the API. The website logic for `createClub`, `requestJoin`, `withdrawJoinRequest`, `leaveClub`, `listJoinRequests` and `decideJoinRequest` already exists in `server/community/clubs.ts` but has **no API route**. The clubs screen says "Joining … on moto-trails.com for now".
- Submit exists only from a recorded ride (`story/submit`). There is no standalone "Submit a trail" entry, and no way to submit from a GPX file.

## 3. Design

### 3.1 Ride card, ride detail, Google Maps

- **Latest ride card becomes one pressable** (`ScalePressable` around `Card`, the pattern `ClubCard` already uses) that opens `/story/[id]`. The separate "View ride story" button goes away, so there is one clear target. "All rides" stays.
- **Ride detail is the existing Story screen**, not a new screen. Changes: the map moves to the top as the hero and becomes interactive (`OsmMap interactive`, which already exists; `RideMap` gets an `interactive` prop). Start and end markers. Stats sit below the map.
- **"Open in Google Maps"** is a `Button variant="soft"` that opens `https://www.google.com/maps/dir/?api=1&destination=<startLat>,<startLng>`. That URL opens the Google Maps app when it is installed and the browser when it is not, on both iOS and Android, so no `LSApplicationQueriesSchemes` or native change is needed. It uses the ride's **start point**, as you specified. Rides with fewer than 2 points hide the button.
- Map line fix per 2.2.

### 3.2 Recording that survives locking, switching apps and crashes

**Principle: capture everything, durably, and decide what to filter later.**

1. **Background capture (native).** Switch to `Location.startLocationUpdatesAsync` with `expo-task-manager`. Config: iOS background mode `location`, `showsBackgroundLocationIndicator`, `pausesUpdatesAutomatically: false`; Android foreground service with a persistent "Recording your ride" notification. Ask for "Always" permission through a plain-language pre-permission step, using existing `Sheet` and `Button`. If the rider declines, recording still works in the foreground and the live screen says so with a `Banner`.
2. **Durable journal.** Every fix is appended to disk the moment it arrives, by the background task itself, so it works even when no screen is mounted. Append-only (SQLite via `expo-sqlite`, or a JSONL file): O(1) per write, unlike rewriting an AsyncStorage array. The recorder store becomes a view over the journal.
3. **Crash recovery.** On launch, an unfinished journal produces a `Banner`: "Recovered a ride from 14:02. Save it or discard it." Nothing is lost on kill, crash or reload.
4. **No capture-time filtering.** Store every fix with its accuracy. The 80 m and 3 m rules move to a pure `cleanTrack()` that runs at finish and at render. It also removes impossible jumps (implied speed above about 250 km/h) and smooths jitter. Raw data is kept with the ride until upload, so the cleaning can be improved later.
5. **Segments.** A gap longer than N seconds starts a new segment. GPX gets one `trkseg` per segment, and the map draws no fake line across a gap. Stats use moving time and the sum of real segments. The story shows "GPS gap 1.2 km" when there is one.
6. **Live health.** The live screen shows "Last fix 3 s ago". If no fix arrives for 15 s or more it shows a `Banner` ("Lost GPS signal, still recording"). Android also gets a wake lock; web uses the Wake Lock API as best effort and says plainly that a hidden tab can stop recording.
7. **Tests.** `cleanTrack` and segmenting are pure and get fixture traces (tunnel gap, urban jitter, teleport spike, 6 km straight run). The journal gets a kill-and-recover test. **Device protocol:** a 6 km ride with the screen locked for 10 minutes, then Google Maps in front for 10 minutes, then force-quit mid-ride and relaunch. The ride is not "fixed" until that passes on a real phone.

This needs a **new dev build** (new native modules and permissions). Expo Go and web cannot test it.

### 3.3 Caching: how it works and what I'll build

**How larger products do it.** The common pattern is stale-while-revalidate: show the saved copy instantly, then check in the background. The check is a conditional HTTP request (`ETag` / `If-None-Match`), so when nothing changed the server answers `304` with no body, which is almost free. For big collections they sync deltas (a cursor, "what changed since X") instead of refetching. Storage is bounded by a byte budget and evicts least-recently-used entries. Content that is immutable (a versioned file) is cached forever. User-pinned content is never evicted.

**Our design: three tiers.**

| Tier | What | Lifetime |
|------|------|----------|
| Memory | In-flight request dedupe and the current session | Session |
| Disk entity cache | Every API response the rider opens: `{key, data, etag, fetchedAt, lastUsedAt, bytes}` in `expo-sqlite` | Until evicted |
| Pinned offline packs | Existing `useTrailStore.offline` | Until the rider removes them. Never evicted |

- **Eviction.** Default budget 50 MB. When over budget, delete least-recently-used entries (`lastUsedAt`) until under, never touching pinned packs. Opening an entry updates `lastUsedAt`.
- **Freshness per kind** (when to re-check, not when to discard):

| Data | Re-check after | Why |
|------|----------------|-----|
| Trail status / condition | 1 hour | Safety information. Stale shows an "as of" label |
| Trail detail | 24 hours | Edits go through moderation, so they are rare |
| Route geometry | Never (keyed by revision) | Immutable per revision |
| Search / lists | 5 minutes | Cheap to refresh |
| Me, clubs | 2 minutes, and on any mutation | Mutations invalidate by tag |
| Bike catalogue | 7 days | Rarely changes |

- **Server additions** (`apps/web`): `ETag` and `Cache-Control` on `GET /api/v1`, and `GET /api/v1/trails/changes?since=<cursor>` returning ids that changed or were removed. On app foreground, at most once per 30 minutes, one call to `changes` invalidates stale cached trails together, instead of N separate checks.
- **Client:** `useFetch` becomes read-through. It returns the disk copy immediately, revalidates when stale, dedupes in-flight requests, and offline serves the copy. A stale copy shows a `Chip`/caption "Saved 3 days ago", never a silent old status.
- **Images and tiles:** use `expo-image` disk caching for photos, and cap MapLibre's ambient tile cache (`setMaximumAmbientCacheSize`). These two are usually the largest bytes.
- **Library call (mine):** TanStack Query for dedupe, staleness and invalidation, with our own SQLite persister and LRU. Writing that machinery by hand is more code and more bugs than adopting it. If you would rather add no dependency, the alternative is extending `useFetch` by hand; it is more code to own.

### 3.4 Submit a trail, create a club, join a club

**Submit a trail.** A "Submit a trail" row on the Trails tab opens the existing submit form, with a first step: pick a recorded ride (current flow) or pick a GPX file (`expo-document-picker`, already a dependency). The form is reused, not rebuilt. A "My submissions" list shows status (sent, in review, published) using `StatusChip` and `ListCard`.

**Clubs.** The logic exists on the website, so the work is exposing it:
- New API routes (`apps/web`): `POST /clubs` (create), `POST /clubs/{id}/join` (request, with phone and message, matching `requestJoin`), `DELETE /clubs/{id}/join` (withdraw), `DELETE /clubs/{id}/membership` (leave), `GET /clubs/{id}/requests` and `POST /clubs/requests/{id}` (admin accept or decline). Each wraps the existing function, so the rules (women-only, last admin, phone purge) are unchanged and not re-implemented.
- Screens: Clubs tab gets "Start a club" (`SectionTitle onAdd`, the existing pattern). Club screen gets a Join / Withdraw / Leave button by state and, for admins, a "Join requests" list (`ListCard` + `Row`). Create and join use `Field` and `Sheet`.

### 3.5 Recommendations

In order of value to a rider, none included in scope until you pick:
1. **Share live location with emergency contacts** during a ride. Builds on SOS and the contacts you already store.
2. **Offline map tiles for downloaded trails.** Today a pack saves data but "map tiles still need a connection", which is the failure that matters off-grid.
3. **Auto-pause and a ride summary share image.**
4. **Report a trail condition or hazard from the app.** Feeds the status system the site is built around.
5. **Service reminders from odometer.** `todos` and total km already exist, so this is mostly wiring.

### 3.6 Design system

Reuse only: `Card`, `ScalePressable`, `Button`, `Banner`, `Sheet`, `Chip`/`StatusChip`, `ListCard`/`Row`, `Field`, `EmptyState`, `SectionTitle`, `BackHeader`, `OsmMap`. I do not expect any new component. If one turns out to be needed I will stop and ask.

Audit, done after each phase on screenshots (simulator and web), against `DESIGN.md` rules (semantic tokens only, 44 px targets, visible focus, reduced motion, a text equivalent for maps) and against how Strava, Komoot and Apple Fitness treat ride detail: map first, one primary action, stats scannable, no duplicate paths to the same screen. Already spotted: `live.tsx` uses literal spacing numbers where `ClubCard` uses `space` tokens, and the inert-card-plus-button duplication on Home.

## 4. Order and verification

| Phase | Delivers | Done when |
|-------|----------|-----------|
| 1 | Recorder durability (3.2) | Pure tests pass and the device protocol passes on a real phone |
| 2 | Ride line fix, ride detail, card tap, Google Maps (3.1) | Reproduced bug is fixed on your platform; the card and detail match screenshots |
| 3 | Cache (3.3) | Airplane-mode open of a viewed trail works; a changed trail updates; budget eviction test passes |
| 4 | Clubs and submit (3.4) | Create, request, withdraw, accept and leave each work end to end |
| 5 | Design audit pass and whichever recommendations you choose | Audit list cleared |

Recording goes first because it loses riders' data. Each phase is its own branch and review.

## 5. Open questions (yours to answer)

1. Where did you see the missing line and the lost GPX: iPhone dev build, Android, or web? It changes how I reproduce phase 2, and web cannot record in the background at all.
2. Are you OK asking riders for "Always" location permission (iOS blue indicator, Android notification, App Store justification text)? Background recording is not possible without it.
3. Are you OK with adding `expo-task-manager`, `expo-sqlite`, `expo-image` and TanStack Query, plus new API routes in `apps/web`?
