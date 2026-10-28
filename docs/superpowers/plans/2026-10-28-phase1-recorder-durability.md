# Phase 1: Recorder Durability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ride recorded on iOS or Android keeps every GPS fix through screen lock, app switching, signal loss and app kill, and shows gaps honestly.

**Architecture:** Fixes are appended to an on-disk journal by a background location task the moment they arrive. The recorder store is a view over that journal. Filtering and segmenting move from capture time to pure functions (`cleanTrack`, `splitSegments`, `trackStats`) that run at finish and render time. An unfinished journal at launch offers recovery.

**Tech Stack:** Expo SDK 58, `expo-location` (background updates), `expo-task-manager`, `expo-sqlite`, `expo-keep-awake`, zustand, vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-rides-recording-cache-clubs-design.md` section 3.2 (and 2.1 for the causes).

## Global Constraints

- Work in `apps/mobile`. Tests: `npm test` (vitest, `src/**/*.test.ts`, pure TypeScript, no React Native imports in tested modules). Typecheck: `npm run typecheck`.
- UI uses existing components only (`Banner`, `Sheet`, `Button`, `Text`). No new components. Semantic tokens and `space` tokens, not literal numbers, in new code.
- Capture nothing-filtered: no accuracy or distance filter at capture time. Journal stores `lat, lng, t, ele, speed, acc` for every fix.
- Thresholds (exact): drop accuracy over **100 m**; drop implied speed over **250 km/h**; drop a point within **3 m** of the last kept point; start a new segment when the time gap is over **60 s** and the distance across it over **150 m**; "no fix" warning at **15 s**.
- Permission copy asks for "Always" location. iOS shows the background indicator; Android shows a persistent "Recording your ride" notification.
- Old saved rides (`points` only, no `breaks`) must still load and render.
- Web is best effort: no background task; uses Wake Lock where available. It must not crash on missing native modules.

## Review Focus

- Zero fixes, or one fix, at finish: no ride saved, no crash (`finishRide` already returns undefined under 2 points; keep it).
- Two fixes with identical timestamps, or timestamps going backwards (phone clock change): no division by zero, no negative duration.
- A long stop (chai break, 20 min, no fixes, no movement): must NOT be reported as a GPS gap.
- Accuracy missing (`undefined`): treat as acceptable, not dropped.
- Journal contains a ride from a previous session when a new ride is started: the user is asked first; the old one is never silently overwritten.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/track.ts` (new) | Pure: `cleanTrack`, `splitSegments`, `trackStats` |
| `src/lib/track.test.ts` (new) | Tests for the above |
| `src/lib/journal.ts` (new) | `Journal` interface + `createMemoryJournal()` (tests) + `sqliteJournal` (app) |
| `src/lib/journal.test.ts` (new) | Journal behavior against the memory implementation |
| `src/lib/geo.ts` (modify) | `LatLng` gains `acc?: number`, `speed?: number \| null` |
| `src/lib/gpx.ts` (modify) | `buildGpx` writes one `trkseg` per segment |
| `src/store/rides.ts` (modify) | `Ride.breaks?: number[]` |
| `src/store/recorder.ts` (modify) | Backed by journal; `ingest`, `recover`, `discardRecovered` |
| `src/lib/backgroundLocation.ts` (new) | `defineTask` handler, `startBackground`, `stopBackground`, permission request |
| `src/RecorderHost.tsx` (modify) | Start/stop background task, keep awake, web fallback |
| `src/lib/finishRide.ts` (modify) | Use `cleanTrack` + `splitSegments` + `trackStats` |
| `app/ride/live.tsx` (modify) | Last-fix age, lost-signal `Banner`, "Always" explainer `Sheet` |
| `app/(tabs)/index.tsx` (modify) | Recovery `Banner` |
| `app/story/[id].tsx` (modify) | Show "GPS gap" stat when gaps exist |
| `app.json` (modify) | Background location, task-manager, notification config |
| `docs/superpowers/plans/device-test-recording.md` (new) | Manual device protocol |

---

### Task 1: Pure track pipeline

**Files:**
- Create: `src/lib/track.ts`, `src/lib/track.test.ts`
- Modify: `src/lib/geo.ts` (extend `LatLng`)

**Interfaces:**
- Produces: `LatLng` with optional `acc?: number` and `speed?: number | null`.
  `cleanTrack(points: LatLng[]): LatLng[]`
  `splitSegments(points: LatLng[]): LatLng[][]`
  `trackStats(segments: LatLng[][]): { distanceM: number; movingSec: number; gapM: number; maxKmh: number }`

- [ ] **Step 1: Write failing tests** in `track.test.ts` using a helper `pt(lat, lng, tSec, acc?)` (lat/lng offsets in metres from a fixed origin via 1e-5 deg ≈ 1.1 m):
  - `drops accuracy over 100 m but keeps undefined accuracy`
  - `drops a teleport spike (implied 400 km/h) and keeps the points either side`
  - `drops points within 3 m of the last kept point`
  - `a 20 minute stop with identical position and no fixes is one segment` (gap time 1200 s, distance 0)
  - `a 2 km hole over 90 s starts a second segment`
  - `identical timestamps and backwards timestamps do not throw or give negative movingSec`
  - `trackStats gapM equals straight-line distance across a break; distanceM excludes it`
  - `empty and one-point input return empty/one-point results`
- [ ] **Step 2: Run** `npm test -- track` → Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the three functions in `src/lib/track.ts` with the Global Constraints thresholds. `movingSec` sums `dt` of consecutive in-segment pairs where `dt > 0` and speed over 1 km/h. Reuse `haversine` from `geo.ts`.
- [ ] **Step 4: Run** `npm test -- track && npm run typecheck` → Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): pure track cleaning, segments and stats`

### Task 2: Segmented GPX and ride shape

**Files:**
- Modify: `src/lib/gpx.ts`, `src/store/rides.ts`, `src/lib/lib.test.ts`

**Interfaces:**
- Consumes: `splitSegments` (Task 1).
- Produces: `buildGpx(name, points, waypoints?, breaks?: number[]): string`; `Ride.breaks?: number[]` (indices into `points` where a new segment starts). `segmentsOf(ride): LatLng[][]` exported from `rides.ts`, returning one segment when `breaks` is absent.

- [ ] **Step 1: Failing tests** in `lib.test.ts`: `buildGpx with breaks [3] writes two <trkseg> and all points`; `buildGpx without breaks writes one <trkseg> (unchanged output)`; `segmentsOf a legacy ride returns one segment`.
- [ ] **Step 2: Run** `npm test -- lib` → FAIL.
- [ ] **Step 3: Implement** `buildGpx` breaks parameter and `segmentsOf`. Existing callers keep working (parameter optional).
- [ ] **Step 4: Run** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(mobile): segmented GPX export`

### Task 3: Durable journal

**Files:**
- Create: `src/lib/journal.ts`, `src/lib/journal.test.ts`
- Modify: `package.json` (via `npx expo install expo-sqlite`)

**Interfaces:**
- Produces:
  ```ts
  type JournalMeta = { startedAt: number; source: 'gps' | 'sim' };
  interface Journal {
    begin(meta: JournalMeta): Promise<void>;       // clears any previous ride, writes meta
    append(fix: LatLng): Promise<void>;            // O(1), durable on resolve
    appendWaypoint(w: { name: string; lat: number; lng: number }): Promise<void>;
    read(): Promise<{ meta: JournalMeta; points: LatLng[]; waypoints: Waypoint[] } | null>; // null when no unfinished ride
    clear(): Promise<void>;
  }
  createMemoryJournal(): Journal;      // for tests
  export const journal: Journal;       // sqlite-backed (expo-sqlite), table rows only appended
  ```

- [ ] **Step 1: Failing tests** run against `createMemoryJournal()`: `read returns null before begin`; `append preserves order and all fields including acc`; `read after clear is null`; `begin replaces a previous ride`; `waypoints round-trip`.
- [ ] **Step 2: Run** `npm test -- journal` → FAIL.
- [ ] **Step 3: Implement** both journals. SQLite: one `meta` row and a `fixes` table with autoincrement id; use `expo-sqlite`'s async API; open the DB lazily so importing on web (where `expo-sqlite` may be absent) falls back to the memory journal.
- [ ] **Step 4: Run** `npm test -- journal && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(mobile): append-only ride journal`

### Task 4: Recorder store on the journal

**Files:**
- Modify: `src/store/recorder.ts`, `src/lib/finishRide.ts`
- Test: `src/store/recorder.test.ts` (new)

**Interfaces:**
- Consumes: `journal` (Task 3), `cleanTrack`/`splitSegments`/`trackStats` (Task 1).
- Produces on `useRecorder`: `start(source): Promise<void>` (calls `journal.begin`); `ingest(fix: LatLng): void` (appends to journal, updates in-memory points and live `meters`/`speedKmh`/`maxKmh` using only a 250 km/h sanity check, no accuracy or jitter drop); `recoverable: { startedAt: number; points: number } | null`; `checkRecoverable(): Promise<void>`; `recover(): Promise<void>` (loads journal into the store as `running`); `discardRecovered(): Promise<void>`; `lastFixAt: number`. `finishRide()` becomes async, reads the journal, cleans, splits, computes stats, saves the ride with `breaks`, then `journal.clear()`.
- Existing `addPoint` is removed; `RecorderHost` and the sim path call `ingest`.

- [ ] **Step 1: Failing tests** (inject `createMemoryJournal` via a `setJournal` test hook): `ingest persists every fix even with acc 500`; `a store rebuilt from the journal has the same points`; `finishRide on 0 or 1 points saves nothing and clears the journal`; `finishRide saves cleaned points, breaks, and duration from timestamps`; `start while an unfinished journal exists does not overwrite it` (returns without beginning; `recoverable` is set).
- [ ] **Step 2: Run** `npm test -- recorder` → FAIL.
- [ ] **Step 3: Implement.** Update `app/ride/live.tsx` `stop` to `await finishRide()`.
- [ ] **Step 4: Run** `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(mobile): recorder backed by journal, no capture-time filtering`

### Task 5: Background capture and permissions

**Files:**
- Create: `src/lib/backgroundLocation.ts`
- Modify: `src/RecorderHost.tsx`, `app/_layout.tsx` (import the module so `defineTask` runs at startup), `app.json`, `package.json` (`npx expo install expo-task-manager expo-keep-awake`)

**Interfaces:**
- Produces: `TASK_NAME = 'myto-ride-recording'`; `requestRideLocationAccess(): Promise<'always' | 'foreground' | 'denied'>`; `startBackground(): Promise<void>`; `stopBackground(): Promise<void>`. Task handler maps each `locations` entry to a `LatLng` (with `acc`, `speed`) and calls `journal.append` then `useRecorder.getState().ingest` when a store exists.

- [ ] **Step 1: Configure `app.json`:** `expo-location` plugin with `isIosBackgroundLocationEnabled: true`, `isAndroidBackgroundLocationEnabled: true`, `isAndroidForegroundServiceEnabled: true`, and `locationAlwaysAndWhenInUsePermission` text ("Myto records your ride's route in the background so it keeps recording when your screen is locked or another app is open."); add `expo-task-manager`. Verify with `npx expo config --type introspect` that `UIBackgroundModes` includes `location`.
- [ ] **Step 2: Implement** `backgroundLocation.ts`: `startLocationUpdatesAsync(TASK_NAME, { accuracy: BestForNavigation, distanceInterval: 5, timeInterval: 1000, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true, activityType: Location.ActivityType.AutomotiveNavigation, foregroundService: { notificationTitle: 'Recording your ride', notificationBody: 'Myto is recording your route.' } })`. `requestRideLocationAccess` asks foreground then background and returns what was granted. Every function is a no-op returning `'denied'`/void on web.
- [ ] **Step 3: Update `RecorderHost`:** native + status running → `startBackground()`, cleanup `stopBackground()`; permission `'foreground'` falls back to the existing `useLocation` watch calling `ingest`; web keeps the existing watch plus `activateKeepAwakeAsync`/Wake Lock; sim path calls `ingest`.
- [ ] **Step 4: Verify:** `npm run typecheck && npm test` → PASS. Web build still starts: `npm run export:web` completes.
- [ ] **Step 5: Commit** `feat(mobile): background location recording`

### Task 6: Live health, recovery and the Always explainer

**Files:**
- Modify: `app/ride/live.tsx`, `app/ride/index.tsx`, `app/(tabs)/index.tsx`, `app/story/[id].tsx`

**Interfaces:**
- Consumes: `useRecorder.lastFixAt`, `recoverable`, `recover`, `discardRecovered`, `requestRideLocationAccess`, `trackStats`, `segmentsOf`.

- [ ] **Step 1: Pre-permission:** in `app/ride/index.tsx`, before starting a GPS ride, show a `Sheet` ("Keep recording when your phone is locked") with a `Button` "Allow always" that calls `requestRideLocationAccess`. If the result is `'foreground'` or `'denied'`, start anyway and the live screen shows a caution `Banner`: "Recording stops if you lock the phone. Allow Always in Settings."
- [ ] **Step 2: Live screen:** replace the point-count line with "Last fix N s ago" (updates on the existing 1 s tick). At 15 s or more show a `Banner` "Lost GPS signal, still recording".
- [ ] **Step 3: Recovery:** on Home, call `checkRecoverable()` on mount; when set, show a `Banner` "Recovered a ride from {time}. Tap to save or discard" that opens a `Sheet` with `Button` "Save ride" (calls `recover` then `finishRide`) and `Button variant="danger"` "Discard".
- [ ] **Step 4: Story:** when `trackStats(...).gapM > 0` add a "GPS gap" `Stat` (km) to Highlights.
- [ ] **Step 5: Verify:** `npm run typecheck && npm test`; run the web app, simulate a ride, take screenshots of live, recovery banner and story in `Browser`, and check contrast and 44 px targets against `DESIGN.md`.
- [ ] **Step 6: Commit** `feat(mobile): live GPS health, ride recovery, Always explainer`

### Task 7: Device test protocol and run

**Files:**
- Create: `docs/superpowers/plans/device-test-recording.md`

- [ ] **Step 1: Write the protocol** with these cases, each with a pass condition: (a) 6 km real ride, screen locked 10 min; (b) Google Maps in front for 10 min; (c) force-quit mid-ride, relaunch, recover, ride length within 2% of a reference; (d) Airplane mode for 2 min mid-ride (GPS still records); (e) denied "Always": warning shown; (f) repeat a–c on Android 13+ including the notification permission.
- [ ] **Step 2: Build:** `npx expo prebuild` then run a dev build on an iPhone (and on Android after `prebuild`).
- [ ] **Step 3: Run the protocol** with you on the device; record pass or fail per case in the file.
- [ ] **Step 4: Commit** `docs(mobile): recording device test protocol and results`

### Task 8: Supabase keep-alive (apps/web, independent of Tasks 1 to 7)

Why: Supabase free projects pause after about 7 days without activity. `vercel.json` already runs one daily cron (`purge-contact-shares`, which queries Postgres), so activity probably exists, but it depends on `CRON_SECRET` being set in Vercel and on that cron staying. A dedicated, explicit keep-alive removes the dependency.

**Files:**
- Create: `src/app/api/cron/keepalive/route.ts`, `src/app/api/cron/keepalive/route.test.ts`
- Modify: `vercel.json` (add a second cron)

**Interfaces:**
- Produces: `GET /api/cron/keepalive` → `200 { db: true, rest: boolean | null }`; `401` without the `CRON_SECRET` bearer (same check as `purge-contact-shares`; extract the check into `src/server/api/cron-auth.ts` as `isCronRequest(request: Request): boolean` and use it from both routes).

- [ ] **Step 1: Failing tests:** `401 without or with a wrong bearer`; `200 and db true with the right bearer` (stub `getSql` to resolve `select 1`); `rest is null when NEXT_PUBLIC_SUPABASE_URL is unset`.
- [ ] **Step 2: Run** `npm test -- keepalive` (from `apps/web`) → FAIL.
- [ ] **Step 3: Implement.** Run `select 1` through `getSql()`. If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, also `fetch` `${url}/rest/v1/` with the `apikey` header, so both the database and the API see traffic; `rest` is `res.ok` or null.
- [ ] **Step 4: Schedule** in `vercel.json`: `{ "path": "/api/cron/keepalive", "schedule": "0 4 * * 1,4" }` (Monday and Thursday: about two chances inside every 7 days, within Vercel Hobby's once-a-day limit).
- [ ] **Step 5: Run** `npm test && npm run typecheck` → PASS.
- [ ] **Step 6: Commit** `feat(web): scheduled Supabase keep-alive`
- [ ] **Step 7 (owner, not code):** confirm `CRON_SECRET` (32+ characters) is set in the Vercel project, and that the Supabase project is not already paused. A cron that gets 401 keeps nothing alive.

---

## Self-review notes

- **Spec coverage:** background capture (T5), journal and crash recovery (T3, T4, T6), no capture-time filtering and `cleanTrack` (T1, T4), segments and gap display (T1, T2, T6), live health and wake lock (T5, T6), pure tests plus device protocol (T1, T7). Android foreground service and notification covered in T5 and T7.
- **Not in this phase:** ride line fix, ride detail, caching, clubs, submit (phases 2 to 4).
- **Assumption:** `expo-sqlite` and `expo-task-manager` ship SDK 58 builds; `npx expo install` picks the matching versions.
