# Pause, stopped detection and ride journal: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox syntax.

**Goal:** Pause/resume a ride, detect reliably when the vehicle is stopped, and add a local-only ride journal (notes, voice, photos) shown on Home and You, backed up and restored with the rest of the data.

**Architecture:** Pause is stored as events in the ride journal (so it survives a kill) and feeds `buildRide`. Stopped detection is a pure reducer over the GPS fix stream, held in a small store fed by `RecorderHost`. The ride journal is a persisted zustand store of entries plus files in a private folder; backup version 2 carries entries and files.

**Tech Stack:** Expo SDK 58, `expo-audio` (installed), `expo-image-picker`, `expo-file-system`, zustand, vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-ride-journal-design.md` (sections 6 to 8) and `docs/superpowers/specs/2026-10-28-rides-recording-cache-clubs-design.md` section 3.2.

## Global Constraints

- Work in `apps/mobile`. Tests: `npm test` (vitest, alias `@` set). Typecheck: `npx tsc --noEmit`. Existing recording tests must keep passing.
- Existing components only (`Card`, `Sheet`, `Field`, `Button`, `IconButton`, `ListCard`/`Row`, `Banner`, `EmptyState`, `SectionTitle`, `BackHeader`, `PageTitle`, `HoldButton`). No new components. Use `space`/`radius` tokens in new code.
- Journal data never touches the network: `src/lib/journalMedia/` imports nothing from `src/api` (a test enforces it, like `localMedia`).
- Stopped rule constants (exact): dwell **8 s**; slow under **2 km/h**; moving at **6 km/h or more**; radius `max(8 m, 1.5 x accuracy)`; accuracy must be **50 m or better**; stale after **5 s**; fail safe = moving.
- Drift rule: a fix within `max(3 m, min(accuracy, 15 m))` of the last kept point is dropped by `cleanTrack` and the live track.
- Backup: `CURRENT_VERSION` becomes 2; a version 1 file imports with an empty journal. Journal photos and voice files travel as base64 in the payload.
- Deleting a ride deletes its journal entries and files, after a confirmation that says so. Erase all my data deletes all journal data.
- Pause: duration excludes paused time; a pause starts a new GPS segment and is not shown as a GPS gap (story shows the gap stat only from **150 m**).

## Review Focus

- Pause while the app is killed, then recovery: still paused, timer and duration correct.
- Finishing a ride that is paused at that moment: the open pause ends at finish.
- Stopped detection with 1 km/h persistent speed while parked, slow traffic at 3 km/h, null or -1 speed, poor accuracy, and no fixes: each does the safe thing.
- A note being typed when the vehicle starts moving: draft saved, editor closed, nothing lost.
- A ride with journal entries deleted, erased, exported, imported (replace and merge): files and entries stay consistent; missing media file does not fail the export.

---

### Task 1: Pause in the journal and the saved ride
**Files:** `src/lib/journal.ts`, `src/lib/journalStore.ts`, `src/lib/track.ts`, `src/lib/buildRide.ts`, `src/store/rides.ts`; tests in `journal.test.ts`, `track.test.ts`, `buildRide.test.ts`.
**Interfaces:** Produces `type Pause = { from: number; to?: number }`; `Journal.pause(t)`, `Journal.resume(t)`; `JournalRide.pauses: Pause[]`; `splitSegments(points, pauses?: Pause[])` (a pause between two fixes starts a segment); `Ride.pausedSec?: number`.
- [ ] Tests: memory journal round-trips pause/resume (open pause has no `to`); `begin` clears pauses; `splitSegments` breaks at a pause even with 5 s and 3 m between fixes; `buildRide` duration excludes paused time, closes an open pause at `now`, and `pausedSec` is set; a pause is not counted as a gap by the story threshold (150 m).
- [ ] Implement in memory + sqlite (`events` table: kind, t).
- [ ] Verify `npm test`; commit `feat(mobile): pause events in the journal and saved ride`.

### Task 2: Pause in the recorder and live screen
**Files:** `src/store/recorderCore.ts`, `src/RecorderHost.tsx`, `app/ride/live.tsx`, `app/(tabs)/index.tsx`, `app/ride/index.tsx`; tests in `recorder.test.ts`.
**Interfaces:** `useRecorder`: `paused: boolean`, `pausedMs: number` (finished pauses), `pausedAt: number`, `pause(): Promise<void>`, `resume(): Promise<void>`, `elapsedMs(now): number`. `ingest` while paused is journal-skipped and ignored. `recover()` restores paused state.
- [ ] Tests: pause stops points being added or journaled; resume continues; `elapsedMs` excludes paused time and is frozen while paused; recover of a journal with an open pause gives `paused: true` and correct `elapsedMs`; `moving` false while paused.
- [ ] Implement. `RecorderHost`: while paused, stop the background task and the recording fallback, keep the shared watch (dot and stopped detection). On resume, start again.
- [ ] Live screen: Pause/Resume button beside Waypoint (same sizes), timer uses `elapsedMs`, header reads "Paused", Hold-to-stop still works while paused. Home: when a ride is running or paused, a `Banner` ("Ride in progress" or "Paused", tap returns to `/ride/live`).
- [ ] Verify tests + typecheck + browser check with a simulated ride (pause freezes the timer and distance, resume continues); commit.

### Task 3: Reliable stopped detection
**Files:** `src/lib/motion.ts`, `src/lib/motion.test.ts`, `src/store/motion.ts`, `src/RecorderHost.tsx`, `src/lib/location.ts`, `src/lib/track.ts`, `src/store/recorderCore.ts`.
**Interfaces:** `type MotionState = { stopped: boolean; runStart?: number; anchor?: { lat: number; lng: number }; lastFixAt: number }`; `initialMotion: MotionState`; `stepMotion(s: MotionState, f: { t: number; lat: number; lng: number; speed?: number | null; acc?: number }): MotionState`; `isStopped(s: MotionState, now: number): boolean` (false when stale). `useMotion`: `{ stopped: boolean }` updated by `RecorderHost` on every fix and on a 1 s tick while a ride runs.
- [ ] Tests (fixtures, fixes every 1 s): 40 km/h is moving; parked with persistent 1 km/h and 5 m wander is stopped after 8 s and not before; stopped then 8 km/h is moving at once; creeping 3 km/h never becomes stopped; accuracy 80 m never stopped; speed null and static positions becomes stopped; speed -1 treated as no speed; no fix for 6 s means not stopped; 2 to 6 km/h while stopped keeps it stopped (hysteresis).
- [ ] Implement. Change the foreground watch to `distanceInterval: 0` so a stopped phone keeps reporting. Add the drift radius rule to `cleanTrack` and to the live track; tests: a 20 minute stop with plus/minus 4 m drift adds under 100 m.
- [ ] Verify; commit `feat(mobile): reliable stopped detection and drift filtering`.

### Task 4: Journal data and files
**Files:** `src/lib/journalEntries.ts` (+test), `src/store/journal.ts`, `src/lib/journalMedia/index.ts`, `src/lib/journalMedia/journalMedia.test.ts`.
**Interfaces:** `JournalEntry` as in the design; `summarise(entries): string` ("2 notes · 1 voice · 3 photos"); `groupByRide(entries): { rideKey: number; entries: JournalEntry[]; last: number }[]` newest ride first, entries oldest first; `useJournal`: `entries`, `add(e)`, `remove(id)`, `removeForRide(rideKey)`, `wipe()`. `journalMedia`: `savePhoto(sourceUri): Promise<{id,width,height}>`, `saveVoice(sourceUri): Promise<{id}>`, `mediaUri(id, kind)`, `deleteMedia(id, kind)`, `deleteAllMedia()`, `readBase64(id, kind)`, `stage/commit/discard` for restore.
- [ ] Tests: `summarise` wording and pluralisation, empty; `groupByRide` order; store add/remove/removeForRide (with an injected media-delete adapter); the no-`src/api` import test.
- [ ] Implement.
- [ ] Verify; commit.

### Task 5: Voice, photo and the journal screens
**Files:** `app/journal/index.tsx`, `app/journal/[rideKey].tsx`, `src/features/JournalEntryCard.tsx`, `src/lib/useVoiceRecorder.ts`, `app.json` (`expo-audio` microphone permission text); edits to `app/(tabs)/index.tsx`, `app/(tabs)/you.tsx`, `app/story/[id].tsx`, `app/ride/live.tsx`.
- [ ] `app.json`: `expo-audio` plugin with `microphonePermission` "Myto records voice notes for your ride journal. They stay on this phone."
- [ ] Journal list screen (`ListCard`/`Row` per ride: name, `summarise`, date), timeline screen (note `Card`, photo `Card`, voice `Card` with `IconButton` play/pause and duration), add note via `Sheet` + `Field` (disabled with "Available when you have stopped" while a ride is recording and `useMotion.stopped` is false; draft saved and editor closed if motion starts), Record voice (tap start/stop, timer), Add photo (camera or library).
- [ ] Home: "Recent journals" section (last 3 rides with entries, `EmptyState`, "All journals" button). You: "Ride journal" row with count. Story: "Journal" button. Live: "Journal" text button in the header opens a `Sheet` with Voice, Photo and Write a note (gated).
- [ ] Ride delete (story): when the ride has entries, confirm `Sheet` says the journal is deleted too; deleting runs `removeForRide`.
- [ ] Verify: typecheck, tests, web screenshots for list, timeline, Home section, You row, note gating (simulated ride). Commit.

### Task 6: Backup, restore, erase
**Files:** `src/lib/backup/format.ts`, `migrate.ts`, `export.ts`, `import.ts`, `device.ts`, `src/ui/BackupSummary.tsx`, `app/(tabs)/you.tsx`, `app/backup/export.tsx`; tests in `backup.test.ts`.
**Interfaces:** `Snapshot.journal: JournalEntry[]`; `BackupPayload.journalFiles: Record<string, string>` keyed `"<kind>:<id>"`; `migrations[1]` adds `journal: []`, `journalFiles: {}`; `Summary.journalEntries`.
- [ ] Tests: v1 payload migrates; export then import round-trips entries and files (replace and merge); a missing media file is skipped on export without failing; summary counts; stage/commit/discard for journal media; erase removes entries and files.
- [ ] Implement; update export page copy and the import summary.
- [ ] Verify full suite; commit.

### Task 7: Background location native settings
- [ ] `npx expo prebuild --platform ios --no-install` (and android if it generates cleanly); confirm `Info.plist` has `UIBackgroundModes: location` and the Always usage text; review the diff, commit the native project changes. If CocoaPods or Xcode is needed, stop and tell the owner exactly what to run.

### Task 8: Final review and fix pass (fresh reviewer, most capable model)
