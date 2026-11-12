# Home Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A rider saves Home (and optionally Work). The app offers "Ride home" after a ride, at a usual riding time and when daylight is running out, starting guidance in one tap. It can also stop recording by itself on arriving home or at work, and the recorder spends less battery throughout.

**Architecture:** A persisted `places` store holds Home. A pure engine (`lib/homeRoute/`, same shape as `lib/nudge/`) takes a plain `HomeWorld` and returns an offer or nothing. A hook builds the world from the stores and the shared GPS fix; one card component shows the offer on Dash, the ride story and the Ready screen. Guidance reuses `/navigate` (no recording) or `/ride?autostart=1` with `useGuideTarget` (record the leg). Phase 2 adds a local "Heading home?" nudge under the existing governor. A second pure engine (`stepAutoEnd`) decides when arrival at Home or Work ends the ride (warn, then end; strikes make it ask instead), and a third (`chooseProfile`) picks the GPS sampling profile (full, saver, idle) from battery, navigation and standing still.

**Tech Stack:** Expo / React Native, expo-router, zustand + AsyncStorage persist, vitest, TypeScript. All paths below are under `apps/mobile/` unless stated.

**Spec:** `docs/superpowers/specs/2026-11-12-home-routing-design.md`

## Global Constraints

- Free tier only: no server, no paid geocoding or routing; place search is the existing `searchPlaces` (`src/lib/placeSearch.ts`).
- No new tabs or layout change (ADR 0009). Four tabs stay; the card goes on existing screens.
- Mobile styling uses tokens only: no raw spacing, colour or type values. Run `npm run check:tokens` after each UI task (repo root).
- Home never leaves the phone: not in any API payload, not in a shared or published route.
- Battery: no new continuous GPS watch and no new repeating timer. Any new position read is one-shot at Balanced accuracy, or reuses a fix the recorder already has. Arrival checks run only on fixes that already arrive. Local notifications are scheduled once, never polled.
- Auto-end never discards data: the ride is saved by the same path as the Stop button.
- Phases 1 and 2 add no OS permission. Phase 3 is parked and must not be started without an ADR.
- Tests: `npm test -w @moto-trails/mobile -- <file>` (vitest). Do not run the whole suite for small changes.
- Lean docs (a repo rule in `CLAUDE.md`): each task updates the one existing doc that owns its fact, in the same commit, in about 5 lines at most: Task 1 to 4 and 7 to 11 add a row or line to `apps/mobile/README.md` (a short "Home and recording power use" section, created in Task 1 and extended after); nudge kind to `docs/ride-nudges.md` (Task 11); the places and auto-end switch to `docs/16-myto-app-ui.md` only if a screen is described there. No new doc files besides the spec and this plan. Task 12 only checks the docs are accurate and trims them.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never commit `.env*`, `apps/web/data.sql` or `.claude/`.

## Review Focus

- No Home saved, no GPS fix, or location permission denied: no offer, no crash, no empty card.
- A stale fix (older than 2 minutes) must not trigger an offer for a place the rider has already left or reached.
- A ride that ended at home, or a sample or simulated ride, must not offer "Ride home".
- A short ride (under 1 km) shared or published with 500 m trimmed from each end must not produce an empty or one-point route that breaks the share sheet.
- Auto-end: a rider who stops at Home or Work mid-ride (fuel, a quick errand, a loop that passes home) must be warned first, and cancelling must keep recording and not re-trigger for that place in that ride. Group rides, multi-day trips, rides under 1 km or 5 minutes, and simulated rides never auto-end.
- Usual-time window across midnight (a 23:30 learned start, now 00:10) and the dismissal clock going backwards after a phone clock change.

## File Structure

| File | Responsibility |
|---|---|
| `src/store/placesCore.ts`, `src/store/places.ts` | Home and Work places, auto-end strikes; persisted store (`myto-places`) |
| `src/lib/homeRoute/types.ts` | `HomeWorld`, `HomeOffer`, constants |
| `src/lib/homeRoute/offer.ts` | `decideHomeOffer(w)`: pure rules |
| `src/lib/homeRoute/copy.ts` | Wording per reason |
| `src/store/homeOffer.ts` | Persisted dismissals |
| `src/homeWorld.ts` | Reads stores, returns `HomeWorld` (like `nudgeWorld.ts`) |
| `src/features/home/goHome.ts` | Start guidance to Home |
| `src/features/home/useHomeOffer.ts`, `HomeOfferCard.tsx` | Hook and card |
| `app/home-place.tsx` | Set or clear Home and Work; the auto-end switch |
| `src/lib/homeRoute/autoEnd.ts` | `stepAutoEnd`: pure arrival rules (warn, end, ask) |
| `src/lib/recordingProfile.ts` | `chooseProfile`: pure battery-aware GPS sampling choice |
| `src/lib/backgroundLocation.ts` | Modify: `setRecordingProfile` restarts updates with the chosen options |
| `src/features/ride/endRide.ts` | The Stop button's finish path, shared with auto-end |
| `src/AutoEndHost.tsx` | Runs `stepAutoEnd` and `chooseProfile` on fixes the recorder already receives |
| `src/lib/nudge/*` | Phase 2: `home` nudge kind |

---

### Task 1: Places store

**Files:**
- Create: `src/store/placesCore.ts`, `src/store/places.ts`
- Test: `src/store/places.test.ts`

**Interfaces:**
- Produces: `type SavedPlace = { lat: number; lng: number; label: string; setAt: number }`; `type PlaceKind = 'home' | 'work'`; `usePlaces` with `home?: SavedPlace`, `work?: SavedPlace`, `setPlace(kind: PlaceKind, p: Omit<SavedPlace,'setAt'>, now?: number): void`, `clearPlace(kind: PlaceKind): void`, `endStrikes: Record<PlaceKind, number>`, `addStrike(kind): void`, `clearStrikes(kind): void`. Persist name `myto-places`.

- [ ] **Step 1: Write failing tests** in `places.test.ts` (use the core slice, as `nudges.test.ts` does): `setPlace('home') stores label and coordinates with setAt`; `setPlace replaces an earlier place of the same kind and leaves the other kind alone`; `clearPlace removes it`; `setPlace rejects a non-finite or out-of-range coordinate and keeps the old place` (lat 91, NaN); `addStrike increments one kind, clearStrikes resets it, and replacing a place resets its strikes`.
- [ ] **Step 2: Run** `npm test -w @moto-trails/mobile -- src/store/places.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `placesSlice(): StateCreator<PlacesState>` in `placesCore.ts`, and `usePlaces = create()(persist(placesSlice(), { name: 'myto-places', storage }))` in `places.ts`, following `nudgesCore.ts` / `nudges.ts`.
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): saved Home place store`.

### Task 2: Offer engine

**Files:**
- Create: `src/lib/homeRoute/types.ts`, `src/lib/homeRoute/offer.ts`
- Test: `src/lib/homeRoute/offer.test.ts`

**Interfaces:**
- Consumes: `haversine`, `LatLng` from `src/lib/geo.ts`.
- Produces:
  - Constants (`types.ts`): `AT_HOME_M = 300`, `AWAY_M = 1500`, `JUST_ENDED_MS = 30*60_000`, `USUAL_WINDOW_MIN = 45`, `DUSK_MIN = 60`, `FIX_MAX_AGE_MS = 120_000`, `QUIET_AFTER_DISMISS_MS = 3*3_600_000`, `QUIET_DISMISSALS = 3`, `QUIET_WINDOW_MS = 14*86_400_000`, `QUIET_LONG_MS = 14*86_400_000`.
  - `type HomeWorld = { now: number; home?: { lat: number; lng: number }; pos?: LatLng; posAt?: number; lastRide?: { endedAt: number; sample?: boolean; source?: string }; rideRunning: boolean; inGroupRide: boolean; tripActive: boolean; sunsetMs?: number; usualStartMins: number[]; dismissals: number[] }`
  - `type HomeReason = 'dusk' | 'ride-ended' | 'usual-time'`; `type HomeOffer = { reason: HomeReason; distanceM: number }`
  - `decideHomeOffer(w: HomeWorld): HomeOffer | null`

- [ ] **Step 1: Write failing tests** in `offer.test.ts` with a `world()` builder (default: away 5 km, fresh fix, no ride): `no home returns null`; `no position returns null`; `a fix older than FIX_MAX_AGE_MS returns null`; `within AT_HOME_M returns null`; `between AT_HOME_M and AWAY_M returns null`; `ride ended 10 min ago and away gives ride-ended with the distance`; `ride ended 31 min ago gives null`; `sample ride or source sim gives null`; `rideRunning, inGroupRide or tripActive gives null`; `usual-time: now within 45 min of a learned start gives usual-time`; `usual-time across midnight (learned 23:30, now 00:10) matches`; `dusk: sunset 40 min away gives dusk and beats ride-ended`; `one dismissal 1 h ago gives null, 4 h ago gives an offer`; `three dismissals within 14 days give null until 14 days after the latest`; `a dismissal timestamp in the future (clock moved back) counts as just now`.
- [ ] **Step 2: Run** `npm test -w @moto-trails/mobile -- src/lib/homeRoute/offer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `decideHomeOffer` as ordered guards (suppressions first, then reasons in priority `dusk`, `ride-ended`, `usual-time`). Minutes-of-day distance uses modular arithmetic so 23:30 to 00:10 is 40.
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): home offer engine`.

### Task 3: Copy and dismissal store

**Files:**
- Create: `src/lib/homeRoute/copy.ts`, `src/store/homeOffer.ts`
- Test: `src/lib/homeRoute/copy.test.ts`, `src/store/homeOffer.test.ts`

**Interfaces:**
- Consumes: `HomeOffer`, `HomeReason`.
- Produces: `homeCopy(o: HomeOffer, i: { etaMin?: number; sunsetClock?: string }): { title: string; body: string }`; `useHomeOffer` store `{ dismissals: number[]; dismiss(now?: number): void; clear(): void }` persisted as `myto-home-offer`, keeping only the last 10 timestamps.

- [ ] **Step 1: Write failing tests:** `homeCopy` gives a distinct title per reason, `dusk` body names the sunset clock and the ETA when both are given, and no body contains the saved label or coordinates; `dismiss appends the time and keeps at most 10`.
- [ ] **Step 2: Run both test files.** Expected: FAIL.
- [ ] **Step 3: Implement** both. Copy is plain, no exclamation marks; titles: dusk "Daylight is running out", ride-ended "Ride home?", usual-time "Heading home?".
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): home offer copy and dismissals`.

### Task 4: Home world, hook and goHome

**Files:**
- Create: `src/homeWorld.ts`, `src/features/home/useHomeOffer.ts`, `src/features/home/goHome.ts`
- Test: `src/homeWorld.test.ts`, `src/features/home/goHome.test.ts`

**Interfaces:**
- Consumes: `usePlaces`, `useHomeOffer` store (rename the hook `useHomeOfferNow` to avoid a name clash), `useLocation` (`fix`, `fixAt`) from `src/store/location.ts` (read only, never `acquire`), `useRecorder` (latest point while recording), `useRides`, `useRecorder`, `useTrips`, group state, `fetchSunsetMs` from `src/lib/daylight.ts`, `decideHomeOffer`.
- Produces: `buildHomeWorld(now: number): HomeWorld`; `useHomeOfferNow(): { offer: HomeOffer | null; copy?: {title; body}; home?: SavedPlace }`, which never starts a GPS watch: it uses the recorder's latest point while a ride runs, else a fresh `useLocation` fix if one exists, else one `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` on focus and on returning to the foreground, at most once every 5 minutes, and re-decides only on those events and when the position changes (no interval timer); `goHome(router: Router, home: SavedPlace, opts?: { record?: boolean }): void` which, when `record` is false or unset, pushes `{ pathname: '/navigate', params: { lat, lng } }`, and when true calls `useGuideTarget.getState().set({ lat, lng, name: 'Home' })` then pushes `/ride/live` if `useRecorder` is running or `/ride?autostart=1` otherwise.

- [ ] **Step 1: Write failing tests:** `useHomeOfferNow` takes no new reading within 5 minutes of the last and never calls `useLocation.acquire`; `buildHomeWorld` maps the latest real ride's end time, ignores `sample` rides, reads `usualStartMins` from the ride history using the habit-time logic already in `src/lib/reminders.ts` (search for the function that learns the usual start; reuse, do not duplicate); `goHome` pushes `/navigate` with string coordinates by default, and with `record: true` sets the guide target named Home and pushes `/ride` with `autostart: '1'` (or `/ride/live` when recording).
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** the three. Fetch sunset only when a fix exists and Home is set, cached per day (reuse any existing sunset cache the daylight reminder uses).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): home world, hook and goHome`.

### Task 5: Auto-end engine

**Files:**
- Create: `src/lib/homeRoute/autoEnd.ts`
- Test: `src/lib/homeRoute/autoEnd.test.ts`

**Interfaces:**
- Consumes: `haversine`, `LatLng` (`src/lib/geo.ts`); `ARRIVE_RADIUS_M` (200) and `LEAVE_RADIUS_M` (1000) from `src/lib/autoArrive.ts`; `PlaceKind`.
- Produces:
  - Constants: `MIN_RIDE_M = 1000`, `MIN_RIDE_MS = 5*60_000`, `WARN_AFTER_STOP_MS = 60_000`, `END_AFTER_WARN_MS = 30_000`, `FRESH_FIX_MS = 30_000`, `GUIDED_WARN_AFTER_STOP_MS = 20_000`, `STRIKES_TO_ASK = 2`.
  - `type AutoEndWorld = { now: number; pos?: LatLng; posAt?: number; places: Partial<Record<PlaceKind, { lat: number; lng: number }>>; ride: { running: boolean; paused: boolean; startedAt: number; meters: number; source: string; waypointsAhead: boolean }; inGroupRide: boolean; tripActive: boolean; guideTo?: { lat: number; lng: number }; stoppedForMs: number; enabled: boolean; strikes: Record<PlaceKind, number>; cancelled: PlaceKind[] }`
  - `type AutoEndState = { left: Record<PlaceKind, boolean>; stopWithinSince: Record<PlaceKind, number | null>; warnedAt: number | null }`; `startAutoEnd: AutoEndState`
  - `stepAutoEnd(s: AutoEndState, w: AutoEndWorld): { state: AutoEndState; action: 'warn' | 'end' | 'ask' | null; kind?: PlaceKind }`

How it decides (the "intelligence"): the ride must first have been 1,000 m or more from the place (a loop that returns counts; a ride that only starts there does not). Inside 200 m with a fresh fix and the bike standing still for `WARN_AFTER_STOP_MS` gives `warn`; 30 s later, still standing, `end`. Riding off at any time resets the countdown. When the rider is being guided to that place (`guideTo` within 50 m of it), the stop time is `GUIDED_WARN_AFTER_STOP_MS`. `ask` (never `end`) is returned instead of `warn`/`end` when the kind has `STRIKES_TO_ASK` strikes, or the kind is `work` and the rider was not guided to it. Nothing is returned for a kind in `cancelled`.

- [ ] **Step 1: Write failing tests** (builder defaults: enabled, running 8 km ride of 40 min, home 1 km away at one point earlier, fixes fresh): `disabled, not running or paused returns null`; `a ride under MIN_RIDE_M or MIN_RIDE_MS returns null`; `a sim ride, a group ride or an active trip returns null (a trip is allowed only when guided to that place)`; `waypointsAhead returns null unless guided to the place`; `inside 200 m but never having left 1000 m returns null`; `a ride that left and returned, stopped 60 s, returns warn for home`; `warn then 30 s later returns end`; `riding off between warn and end returns null and resets (state.warnedAt null)`; `a stale fix returns null`; `guided to home, stopped 20 s, returns warn`; `work without guidance returns ask, not end`; `home with 2 strikes returns ask`; `a kind in cancelled returns null for that kind only`; `home and work 150 m apart: the nearer one is chosen`.
- [ ] **Step 2: Run** `npm test -w @moto-trails/mobile -- src/lib/homeRoute/autoEnd.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `stepAutoEnd` as pure state transitions; no clocks inside (time comes from `w.now`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): auto-end arrival engine`.

### Task 6: Shared end-ride path and the auto-end host

**Files:**
- Create: `src/features/ride/endRide.ts`, `src/AutoEndHost.tsx`
- Modify: `app/ride/live.tsx:252-262` (`doStop` calls `endRide`); `app/_layout.tsx` (mount `<AutoEndHost />` beside `<NudgeHost />`); `src/store/companion.ts` (add `autoEnd: boolean`, default `false`, next to `autoPause`, same persistence and setter pattern); `app/home-place.tsx` (see Task 8: the switch is added there)
- Test: `src/features/ride/endRide.test.ts`, `src/AutoEndHost.test.ts`

**Interfaces:**
- Consumes: `stepAutoEnd`, `startAutoEnd`, `AutoEndWorld`; `usePlaces`; `useRecorder`; `useGuideTarget`; `useTrips`; the same reliable-stop signal `CompanionHost.tsx` passes to `stepAutoPause` (extract it into a shared selector if it is private); `finishRide`, `queueRideForOsm`.
- Produces: `endRide(): Promise<string | undefined>` doing exactly what `doStop` does today after `buzz.stop()` (finish the ride, attach to the active trip, queue for OpenStreetMap when recorded by GPS) and returning the ride id; `AutoEndHost` subscribes to the recorder store and runs `stepAutoEnd` only when a fix arrives and `useCompanion.autoEnd` is true (no timer, no extra location reading). On `warn` it schedules one local notification "Arrived home. Ending the ride in 30 seconds. Tap to keep recording" (kind named from the place label), and when the app is in front it shows the same line on the live screen with a "Keep recording" button; on `end` it calls `endRide()`, then `router.replace('/story/<id>')` if the live screen is showing or else a local notification "Ride saved. Tap to see it"; on `ask` it shows "Arrived home. End the ride?" with End and Keep recording. Keep recording (or tapping the warning) adds the kind to `cancelled` for this ride and calls `addStrike(kind)`. A completed `end` that was not cancelled calls `clearStrikes(kind)`. The scheduled warning is removed when the rider rides off.

- [ ] **Step 1: Write failing tests:** `endRide files the ride, attaches it to the active trip and queues it for OSM only for a gps ride` (move the existing assertions about this out of the screen); `doStop in live.tsx calls endRide` (guard test); `AutoEndHost does nothing when autoEnd is off`; `a fix sequence that arrives home and stands still produces one warn then one end and one endRide call`; `Keep recording after a warn adds a strike, the place is cancelled for this ride and a second arrival there does not warn`; `a completed end clears strikes`; `the host runs no timers: it reacts only to recorder store changes` (spy `setInterval` not called).
- [ ] **Step 2: Run** the two files. Expected: FAIL.
- [ ] **Step 3: Implement** `endRide` by moving the body of `doStop` (keep `buzz.stop()` and `stopping.current = true` in the screen), then the host. Warning and result notifications reuse the helper the nudges and reminders use to schedule a local notification (see `src/lib/reminderSync.ts`); do not add a new notification channel.
- [ ] **Step 4: Run** both files and `npm test -w @moto-trails/mobile -- src/lib/autoArrive.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): end the ride on arrival at home or work`.

### Task 7: Battery-aware recording profile

**Files:**
- Create: `src/lib/recordingProfile.ts`
- Modify: `src/lib/backgroundLocation.ts` (`startNow` and a new `setRecordingProfile`); `src/lib/location.ts` (`watchLocation` accepts an optional profile for the foreground watch); `src/store/companion.ts` (add `batterySaver: boolean`, default `true`); `src/AutoEndHost.tsx` (also drives the profile, one subscription, no second host)
- Test: `src/lib/recordingProfile.test.ts`, `src/lib/backgroundLocation.test.ts`

**Interfaces:**
- Consumes: `useBattery` (`level`, `charging`), `useGuideTarget`, group live state, the stop signal from Task 6.
- Produces:
  - `type RecordingProfile = 'full' | 'saver' | 'idle'` and `PROFILE_OPTIONS: Record<RecordingProfile, { accuracy: Location.Accuracy; timeInterval: number }>` with `full = BestForNavigation, 1000` (today's values, unchanged), `saver = High, 3000`, `idle = Balanced, 10_000`.
  - Constants: `SAVER_BELOW_PCT = 20`, `SAVER_ALWAYS_BELOW_PCT = 10`, `PCT_HYSTERESIS = 5`, `IDLE_AFTER_STOP_MS = 120_000`, `MIN_SWITCH_MS = 60_000`, `WAKE_KMH = 5`.
  - `chooseProfile(i: { current: RecordingProfile; lastSwitchAt: number; now: number; batteryPct: number | null; charging: boolean; navigating: boolean; stoppedForMs: number; speedKmh: number; enabled: boolean }): RecordingProfile`
  - `setRecordingProfile(p: RecordingProfile): Promise<void>` in `backgroundLocation.ts`, queued through the existing `inOrder` serial, restarting updates with `PROFILE_OPTIONS[p]` only when it differs from the one running.

Rules: `enabled` false gives `full`. `idle` after `IDLE_AFTER_STOP_MS` standing still, and back to `full` (or `saver`) at once, ignoring `MIN_SWITCH_MS`, when `speedKmh >= WAKE_KMH`. `saver` when not charging and the battery is at or below 20 % and not navigating, or at or below 10 % even when navigating; leaving `saver` needs `SAVER_BELOW_PCT + PCT_HYSTERESIS`. Unknown battery (`null`) counts as healthy. Other changes wait `MIN_SWITCH_MS`.

- [ ] **Step 1: Write failing tests:** `full by default and when disabled`; `idle after 2 minutes standing, and back to full at 5 km/h immediately even inside MIN_SWITCH_MS`; `saver at 20% unplugged, not when charging`; `navigating keeps full at 15% but saver at 9%`; `saver is not left until 25%` (hysteresis: 22% stays saver, 26% returns to full); `null battery stays full`; `no switch inside MIN_SWITCH_MS except to wake`; in `backgroundLocation.test.ts` (mock `expo-location`): `setRecordingProfile restarts updates with the saver options and does nothing when the profile is already running`; `full options equal today's call (BestForNavigation, 1000, distanceInterval 0, AutomotiveNavigation)`.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement** the three. The existing options in `startNow` stay as they are apart from `accuracy` and `timeInterval` coming from the profile.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Verify before relying on a slower profile:** read `src/lib/crashDetect.ts`, `src/lib/autoPause.ts` and `src/lib/motion*.ts` and confirm none needs a 1 Hz GPS cadence (crash detection should be driven by the accelerometer). Note the finding in the commit message. If any does, keep that feature's guard by forcing `full` while it is enabled and say so.
- [ ] **Step 6: Commit** `feat(mobile): battery-aware GPS sampling`.

### Task 8: Set Home screen

**Files:**
- Create: `app/home-place.tsx`
- Modify: `app/(tabs)/you.tsx` (Settings group: add `Row` "Home and work", value the Home label or "Not set", `onPress={() => router.push('/home-place')}`)
- Test: `src/features/home/homePlace.guard.test.ts` (route exists and You has the row, in the style of `noteSheet.guard.test.ts`)

**Interfaces:**
- Consumes: `searchPlaces(query, { near })`, `useLocation`, `usePlaces`.
- Produces: screen with two sections, Home and Work (Work optional), each with three ways to set it: "Use my current location" (disabled with a plain explanation when no fix or permission is denied), a search field with results, and "Remove" when set. Saving shows the label and a line saying places stay on this phone. Below them, a switch "Stop recording when I get home or to work" (`useCompanion.autoEnd`) with a plain sentence: it warns first, never ends group rides or trips, and asks instead after you keep recording twice; and a switch "Save battery on long rides" (`useCompanion.batterySaver`) with a sentence that GPS is sampled less when the battery is low or you are standing still, so distance and top speed may read slightly low. The auto-end switch is disabled with an explanation until Home or Work is set.

- [ ] **Step 1: Write the guard test** asserting `app/home-place.tsx` exists and `you.tsx` contains the string `/home-place`.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** the screen with existing `BackHeader`, `Button`, `ListCard`/`Row`, `EmptyState` components and tokens only. Label for "current location" is the nearest place name from `searchPlaces` reverse lookup if one exists in `placeSearch.ts`, else "Home".
- [ ] **Step 4: Run the guard test, then** `npm run check:tokens` (repo root). Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): set a Home place in You`.

### Task 9: Offer card on Dash, ride story and Ready screen

**Files:**
- Create: `src/features/home/HomeOfferCard.tsx`
- Modify: `app/(tabs)/index.tsx` (first card slot, below an active or just-finished ride card, above the planned-trip card); `app/story/[id].tsx` (top of the story for the ride that just finished, i.e. ended within `JUST_ENDED_MS`); `app/ride/index.tsx` (Ready screen: a "Ride home" quick row); `src/NavigateChoiceHost.tsx` (a "Home" `Button` shown when Home is set)
- Test: `src/features/home/homeSurfaces.guard.test.ts`

**Interfaces:**
- Consumes: `useHomeOfferNow`, `goHome`, `useHomeOffer.dismiss`.
- Produces: `HomeOfferCard` with "Ride home" (calls `goHome(router, home)`), "Record it" (calls `goHome(router, home, { record: true })`) and "Not now" (calls `dismiss()`); renders nothing when there is no offer.

- [ ] **Step 1: Write the guard test** asserting each of the four files imports `HomeOfferCard` or `goHome`, and that `HomeOfferCard` renders `null` for a null offer (render with the hook mocked).
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** the card and wire the four surfaces. On Dash the card never replaces the existing just-finished card (ADR 0009); it sits after it. The Ready screen row and navigate-choice button show whenever Home is set, regardless of the engine.
- [ ] **Step 4: Run** the test and `npm run check:tokens`. Expected: PASS.
- [ ] **Step 5: Verify on the web build** with `preview_start`: set Home, simulate a finished ride away from Home (`useSimRide` / the dev screen), confirm the card appears on Dash and the story, "Not now" hides it, and tapping "Ride home" opens `/navigate`. Report what was and was not seen.
- [ ] **Step 6: Commit** `feat(mobile): Ride home card on Dash, story and Ready screen`.

### Task 10: Privacy: trim shared routes and back up places

**Files:**
- Modify: `src/lib/shareRoute.ts`, the OSM upload path (`queueRideForOsm`) and the club or story publish path, wherever a ride's points leave the phone; `src/lib/backup/export.ts` and `import.ts` (include `myto-places`, and `autoEnd` and `batterySaver` from the companion store if it is not already backed up)
- Test: `src/lib/shareRoute.test.ts`, `src/lib/backup/backup.test.ts`

**Interfaces:**
- Consumes: `trimEnds(points, meters)` from `src/lib/geo.ts`, `usePlaces`.
- Produces: `trimNearPlaces(points: LatLng[], places: LatLng[], meters = 500): LatLng[]` in `src/lib/geo.ts`: removes points within `meters` of Home or Work at the start and end only (not the middle); returns the input unchanged when `places` is empty.

- [ ] **Step 1: Write failing tests:** `trimNearPlaces` drops leading and trailing points within 500 m of Home or Work but keeps a middle pass near either; unchanged when no place is set; a ride entirely within 500 m returns `[]`; `shareRoute` and the OSM and publish paths call it (assert with a ride starting at Home that the first output point is more than 500 m from Home); a share of an empty trimmed route shows the existing "nothing to share" handling rather than throwing; backup round trip restores Home, Work and the auto-end switch and strikes.
- [ ] **Step 2: Run** the three test files. Expected: FAIL.
- [ ] **Step 3: Implement** `trimNearPlaces`, apply it at every point where a route leaves the phone (grep for `trimEnds` and the upload and share call sites; where `trimEnds` already gives a fixed trim, apply Home trim in addition), and add the store to the backup keys using the existing migration pattern in `lib/backup/migrate.ts`.
- [ ] **Step 4: Run** the three files. Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): keep Home out of shared routes and back it up`.

### Task 11: Phase 2: "Heading home?" nudge

**Files:**
- Modify: `src/lib/nudge/types.ts` (`'home'` in `NudgeType`; `NUDGE_META.home` with `cls: 'after'`, label "Ride home", hint "A reminder to head home after a ride"), `src/lib/nudge/candidates.ts` (a `homeNudge(w)` candidate), `src/lib/nudge/copy.ts`, `src/lib/nudge/testWorld.ts` and `NudgeWorld` (add `home?: { lat: number; lng: number }`, `lastRideEnd?: { lat: number; lng: number }`), `src/nudgeWorld.ts`
- Test: `src/lib/nudge/nudge.test.ts`, `src/lib/nudge/simulation.test.ts`

**Interfaces:**
- Consumes: `NudgeWorld`, `haversine`, `AWAY_M`.
- Produces: candidate `{ type: 'home', key: 'home:<endedAt>', fireAt: endedAt + 10*MIN, score: 0.6, route: '/(tabs)', data: {} }`, only when Home is set and the ride's last point is more than `AWAY_M` from it.

- [ ] **Step 1: Write failing tests:** `a ride ending 5 km from Home yields one home candidate 10 minutes after`; `no candidate without Home, or when the ride ended within AWAY_M of it`; `the governor keeps the 08:00 to 21:00 window and one nudge a day for home like any other`; `a home nudge ignored four times in a row rests for 21 days`; extend the six-month simulation with a rider who has Home and assert the totals.
- [ ] **Step 2: Run** the two files. Expected: FAIL.
- [ ] **Step 3: Implement** the new kind, treating it as `after` so the existing 4-day spacing and ignore rules apply. Tapping opens the Dash, where the Task 9 card is shown.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** `feat(mobile): Heading home nudge`.

### Task 12: Arrival, docs and verification

**Files:**
- Modify: `src/CompanionHost.tsx` only if arrival at Home does not close an open check-in (see step 1); `docs/ride-nudges.md` (new `home` row in the kinds table); `CHANGELOG.md`; `docs/superpowers/specs/2026-11-12-home-routing-design.md` (mark phases built)
- Test: `src/lib/autoArrive.test.ts`

- [ ] **Step 1: Read** how `CompanionHost.tsx` builds `ArriveTargets`, and whether the Stop button path closes an open check-in. Auto-end uses the same `endRide`, so an auto-ended ride at Home must close the check-in too (add the assertion to `endRide.test.ts` if not already covered). If a check-in is open while the rider navigates Home, Home must count as `routeEnd`; add a test `arrival at Home closes an open check-in` to `autoArrive.test.ts` and implement only if it fails.
- [ ] **Step 2: Check and trim the lean docs written along the way** (accurate, no duplicates; also one row in `docs/ride-nudges.md`; a short "Recording power use" paragraph in `apps/mobile/README.md` naming the three profiles, the saver rules and that auto-end stops the GPS on arrival; a `CHANGELOG.md` entry following `docs/versioning.md`; no new doc files).
- [ ] **Step 3: Battery check on a real phone** (see `reference-ios-device-build` notes: run from `apps/mobile`, unlock the phone): record the same 45-minute commute twice, saver off then on, and read the battery percent before and after each (or the Xcode energy gauge); then ride home with auto-end on and confirm GPS (the status-bar arrow, the Android notice) is gone within two minutes of arriving. Record the numbers in the commit message. State plainly if this was not done.
- [ ] **Step 4: Run** `npm run typecheck`, `npm run lint`, `npm run check:tokens`, `npm run check:colors`, and `npm test -w @moto-trails/mobile`. Expected: all pass. State anything that fails.
- [ ] **Step 5: Commit** `docs: home routing and recording power use`.

---

## Phase 3 (parked: do not start without the owner's go-ahead)

- **P3-1 ADR** `docs/adr/0012-background-location-for-home.md`: revises `docs/15-myto-app-architecture.md` §10 (background location only when a ride starts). Needs the owner's approval first.
- **P3-2 Geofence:** `startGeofencingAsync` (expo-location) on Work with a TaskManager task; on exit, if Home is set and the rider is away, schedule a local "Heading home?" notification that routes to `/navigate` for Home. iOS allows 20 regions; Android needs a foreground-permission fallback. A consent screen states what is watched and that it stays on the phone. Test the pure exit-to-offer rule; the OS side is checked on a real device.

## Self-review

- **Spec coverage:** saved Home and Work (T1, T8); offer rules and back-off (T2, T3); one-shot position and guidance (T4); auto-end on arrival with warn, strikes and ask (T5, T6); battery profiles (T7); surfaces (T9); privacy trim and backup (T10); Phase 2 nudge (T11); arrival, docs and a device battery check (T12); Phase 3 geofence parked.
- **Type consistency:** `HomeWorld`, `HomeOffer`, `SavedPlace`, `decideHomeOffer`, `goHome`, `useHomeOfferNow`, `stepAutoEnd`, `AutoEndWorld`, `PlaceKind`, `chooseProfile`, `RecordingProfile`, `endRide` are defined once and referenced by those names. The dismissal store is `useHomeOffer` (store) and the hook is `useHomeOfferNow`.
- **Known unknowns for the implementer to check, not to guess:** the existing usual-start learning function in `src/lib/reminders.ts`; any sunset cache in the daylight reminder; whether `placeSearch.ts` has reverse lookup; which call sites send a route off the phone.
