# Delight and motion: a rider-focused reward layer

Status: approved 2026-11-09 and built on `feat/delight-motion` (see "What was built" at the end). Scope: `apps/mobile` only.
Decisions taken (section 9): D1 Marks, D2 no records, D3 haptics on with a switch, D4 Replay included. The owner also asked for vibration on rolling numbers and the live speedometer, which became "Speed ticks" (section 3.3).
Inputs: `DESIGN.md` ("Survey sheet"), `docs/design-tokens.md`, `docs/16-myto-app-ui.md`, the Impeccable `animate` and `delight` playbooks (native iOS and Android branches), and a read of the current motion, haptics, map and screen code.

## 1. Intent

Riders should feel the app noticing what they did, the way a good instrument does: precisely, quietly, and only when it means something. Duolingo rewards showing up daily. We reward the things that make riding better and safer: preparing, maintaining the bike, exploring, riding together, getting home.

**Delight thesis (one sentence):** the app behaves like a survey instrument, so a finished ride is *inked onto the map*, numbers *settle* like a gauge, and a milestone is *stamped* once, then stays put.

This comes from the existing identity (cartographic, ink on paper, one accent) and from what the app already does well (the pull-down bike, engine haptics, the pull quotes). It is not a gamification layer on top.

### Goals
- A memorable close to every ride, drawn on the real map.
- Every control feels certain when touched (press, check, switch, save), consistently, at the hundredth use.
- Progress that is factual and earned: first times and cumulative totals.
- Zero cost: all on-device, no new services, no new native dependency in v1.

### Anti-goals (a failure even if it works)
- Nothing that rewards speed, risk, or riding longer than is wise. No top-speed or "longest ride" records, no leaderboards, no points or XP.
- No streak guilt, no "we miss you" pushes. A nudge is only a useful fact ("chain due in about 80 km").
- Nothing while the bike is moving beyond glanceable, calm feedback. The live HUD stays as it is.
- No confetti, no mascots, no modal "You won!" cards, no bounce for its own sake, no sound by default.
- No new gradients, no decorative icons, no card-per-item (`DESIGN.md`).

## 2. What was wrong with the prototype

The inline preview was off-brand and should be discarded as a reference for look:

| Problem | Correction in this plan |
|---|---|
| Used a generic chat theme, not the app's palette | Only `useTheme().c`, `fixed`, `cardTint`, `heat`, `riders` from `packages/tokens/src/mobile.ts` |
| Route drew on a blank SVG | Route inks onto the real `OsmMap` (MapLibre) |
| Bouncy springs, stamps with rotation, glowing rings | Decelerating curves; overshoot only where a physical object would (needle, odometer), capped at 4% |
| Decorative Tabler icons and "patches" | Flat ink glyphs drawn in `react-native-svg`, one per mark |
| Haptics shown as captions | Real haptics through one vocabulary in `lib/haptics.ts`; the gallery screen (section 4) prints them for review |
| Invented numbers and copy | Copy is derived from real data only; every claim has a data source (section 6) |

## 3. Design language

### 3.1 Motion principles
1. **State first.** Motion explains what changed. If removing it loses nothing, remove it.
2. **Fast by default.** Routine feedback is 100 to 240 ms. Only two moments (the ride-end inking and a mark unlock) are authored sequences.
3. **Decelerate, don't bounce.** Arrivals ease out. Exits are faster than entrances.
4. **Once, then still.** A moment plays the first time it happens. Revisiting a screen shows the final state with no replay (a Replay button on the ride map is the only exception, opt-in).
5. **One celebration per event.** If a ride unlocks a mark and ends a month, show the highest-priority one; the rest appear as quiet rows.
6. **Haptics carry weight, visuals carry meaning, sound stays off.**

### 3.2 Motion tokens (new, in `theme/tokens.ts`, which `check:tokens` exempts)
Today `motion.tsx` holds `EASE` and a literal 320 ms. Both move into one group so no screen writes a number.

| Token | Value | Use |
|---|---|---|
| `motion.duration.tap` | 100 | Press in/out, toggles |
| `motion.duration.quick` | 160 | Check draw, chip select, ring colour change |
| `motion.duration.base` | 240 | List item arrival, sheet content, step change |
| `motion.duration.slow` | 400 | Surface wash, ring close |
| `motion.duration.scene` | 700 | Count-up, stamp, camera settle |
| `motion.duration.trace` | 1400 | Ride-end route inking (the longest thing in the app) |
| `motion.ease.standard` | `bezier(0.4, 0, 0.2, 1)` | The existing `EASE` (matches the website) |
| `motion.ease.arrive` | `bezier(0.16, 1, 0.3, 1)` | Confident arrivals |
| `motion.ease.exit` | `bezier(0.4, 0, 1, 1)` | Leaving |
| `motion.stagger` | `{ step: 40, max: 240 }` | Lists: 40 ms apart, total capped at 240 ms |
| `motion.settle` | spring `{ damping, stiffness }`, tuned once | Odometer and needle only |

### 3.3 Haptic vocabulary (extend `buzz` in `lib/haptics.ts`)
Same discipline as the existing per-action buzzes: a rider in gloves learns them.

| Name | Native call | Means |
|---|---|---|
| `tick` (exists) | selection | A choice or a check changed |
| `confirm` | notification: success | A task finished (ride saved, service logged, all clear) |
| `settle` | impact: medium | A number or object landed (odometer, stamp) |
| `milestone` | `settle` then `confirm` 120 ms later | A mark unlocked. Used rarely |
| `warn` (exists as `help`) | notification: warning | A problem that needs attention |

Android's haptics are faint on many phones (`startEngine` already works around this). `milestone` and `confirm` get an explicit short `Vibration` pattern on Android, as the engine does. A **Feedback → Haptics** switch (default on) gates all of them; system settings are always honoured.

### 3.4 Colour roles for moments (tokens only, both themes)
Rule: a delight moment never introduces a colour. It reuses the role the same thing already has.

| Meaning | Token | Where |
|---|---|---|
| The ride you just rode (inked route) | `fixed.track` | Route line, trace head |
| A planned or ghost route ("pencil") | `fixed.route` at `opacity.stale` | Under the inked line |
| Personal progress, a mark, a milestone | `c.accent` on `c.accentSubtle` | Mark glyph, milestone row, count-up emphasis |
| Maintenance done, all clear, everyone home | `c.good` | Ring closed, check, header |
| Due soon / overdue | `c.caution` / `c.stop` | Ring colour only |
| Moment surface wash | the same `cardTint` the Dash card of that kind uses (clay ride, sage bike, sand journal, sky map) | A 400 ms fade from `c.card` to the tint, held while the moment is on screen |
| Stamps and glyphs | `c.ink` on `c.card`, locked = `c.line` outline | Marks |
| Never | `c.record` and brand red | Reserved for Record and brand; never for a reward or a status |

Depth comes from the existing ladder (`paper` → `card` → `raised`), not new shadows. Any new text/surface pairing (for example `c.good` on the sage tint) gets a case in `theme/contrast.test.ts` before it ships, in light and dark (4.5:1 text, 3:1 graphics).

### 3.5 Type
Numbers that move use Geist Mono (`type.dataLarge`, `type.liveCompact`) with tabular figures so digits never shift width. Copy is sentence case, no exclamation marks, no "successfully" (`docs/16` voice).

## 4. Foundations (build first)

| Piece | Where | Notes |
|---|---|---|
| `motion` tokens | `src/theme/tokens.ts` | Section 3.2. `motion.tsx` reads them; its literal 320 goes away |
| Haptic vocabulary and Feedback switch | `src/lib/haptics.ts`, `src/store/appearance.ts` | Section 3.3 |
| `useCountUp`, `useDrawProgress`, `useOnce` | `src/ui/motionHooks.ts` | Reduced-motion aware, native driver where possible. `useOnce(key)` backs principle 4 |
| `seen` ledger | `src/store/seen.ts` (persisted zustand, like `onboarding.ts`) | Remembers which moments have played, per ride id / mark id |
| `useReducedMotion` | exists in `ui/motion.tsx` | Contract: reduced motion shows the final state at once; colour and state changes stay; nothing spatial |
| Accessibility announcements | `AccessibilityInfo.announceForAccessibility` | Every moment announces its result as text; no information lives only in an animation |
| Gallery screen | `app/dev/motion.tsx`, `__DEV__` only | One replayable instance of every moment, with the haptic name printed. This is how we review motion without riding |

No new dependency. The stack is React Native's `Animated` (native driver for transform and opacity), `react-native-svg` for draws, `expo-haptics`. Reanimated or Skia are not added: a native rebuild per change is costly here (see the iOS device-build notes), and nothing in this plan needs them. Revisit only if spike S1 fails on a low-end Android phone.

## 5. The moments

Each moment lists: trigger, choreography, tokens, haptics, reduced motion, and where it lives.

### M1. Ride end: the route is inked on the map
**Trigger:** first open of a ride's story page after it is saved (`app/story/[id].tsx`, reached from `finishRide`). Never on later visits; a Replay text button sits on the map.
**Where:** `ui/RideMap.tsx` and `ui/map/OsmMap.tsx` (`track`, `trackBreaks`, `waypoints` props already exist), new `features/ride/RideClosing.tsx`.

Sequence (total about 2.4 s, interruptible by any touch, which jumps to the final state):
1. 0 ms: the page opens with the map already fitted to the route (existing). The full track appears as a faint pencil line (`fixed.route`, `opacity.stale`).
2. 200 to 1600 ms (`trace`): the ink line (`fixed.track`) advances along the track under `ease.standard`, with a small head dot (`c.accent` with a `c.card` ring). Pin waypoints and stops pop in (scale 0.7 to 1, `quick`) as the head passes them. GPS gaps stay gaps (`trackBreaks`).
3. 1600 ms: head dot rests on the finish; `confirm` haptic.
4. In parallel from 300 ms: the stat row (distance and time; speed is deliberately left out) counts up with `useCountUp` over `scene` using `ease.arrive`, ending on the exact final figures, mono tabular.
5. 2000 ms: if a mark unlocked on this ride, it stamps in M5 below the stats. One line of text, never a modal.

**Implementation:** MapLibre's `line-trim-offset` (draws only part of a line) is the clean way, so spike S1 checks it in `@maplibre/maplibre-react-native` 11.5 and `maplibre-gl` 6.15 (web). Fallback if absent or janky: a dedicated GeoJSON source whose coordinates are sliced by distance fraction about 30 times a second for 1.4 s, on a track simplified to 250 points or fewer. Both paths are first-open only and cancel when the screen blurs or the app backgrounds. A ride with fewer than two points uses the existing `RouteArt`, drawn by animating `strokeDashoffset`.
**Reduced motion:** map opens with the inked route and final figures at once; the mark row fades in (`quick`).
**Not included:** top speed, "longest ride", comparisons with other people.

### M2. Garage: odometer and service rings
**Where:** `app/bike.tsx`, service reminders (`lib/reminders.ts`, `reminderSync.ts`), `RideFuelCard` area.
- **Odometer:** a bike's total km shows as a row of Geist Mono digit columns (clipped, translateY). When the page opens and the total has changed since last seen (`seen` stores the last shown value), the digits roll to the new value, ones first (40 ms stagger, `scene`, `settle`), then a `settle` haptic. Unchanged total: static, no animation.
- **Service ring (per reminder):** an SVG ring on `c.raised`; the arc is the share of the interval left. Colour: `c.accent` normally, `c.caution` under 15 percent, `c.stop` overdue. Interval changes ease over `slow`.
- **Logging a service:** the ring refills with `ease.arrive` over `slow`, turns `c.good`, a check draws (`quick`), the row washes `cardTint.sage` and relaxes back, `confirm` haptic. Copy: "Chain lubed" and the date. No "Great job".
**Reduced motion:** digits and ring jump to final; colour change stays.

### M3. Checks and checklists
**Where:** `ui/Checkbox.tsx` and every checklist using it (`app/trips/[id].tsx`, `app/safety.tsx`, `todos`), then the ride-start surface.
- **Checkbox:** the InkFill scales 0.85 to 1 (`quick`, `arrive`) and the tick draws (`strokeDashoffset`, `quick`); `tick` haptic. Unchecking is instant opacity, no haptic.
- **List complete:** when the last item is ticked, the list header changes from "3 of 4" to "All clear" in `c.good` with a drawn check (`base`), `confirm` once. Trip readiness (`lib/tripReadiness.ts`) already knows when a trip is ready; reuse it.
- **Optional, later (needs a design of its own):** a short pre-ride check from bike data (tyre pressure last checked N days ago) that arms the Record flow. It is a feature, not a microinteraction, so it is parked under "Later" in section 7.

### M4. Fix it: steps and "job done"
**Where:** `app/fixit/[id].tsx`, `features/fixit/parts.tsx` (`StepProgress`).
- Step change: shared-axis slide on Android, standard push feel on iOS, `base`, step number and `PageDots`-style progress fill follow. No delay between touch and response: this is read with gloves on.
- Each step has a big hit target and a `tick`; the last gives `confirm`.
- **Job done:** a quiet summary: the guide title, the tools used, and "Add to your log" (feeds the "first fix-it guide" mark). The summary arrives with a `slow` wash of `cardTint.sage`.

### M5. Marks (milestones) and the Marks log
**Name:** "Marks", as in survey benchmarks. (Open decision D1.)
**Design:** a flat 56 pt stamp drawn in `react-native-svg`: a ring and one simple glyph in `c.ink` on `c.card`. Locked marks are a `c.line` outline with no glyph. No icons from the library, no colour fill, no tier colours.
**Earned only by facts we already hold** (pure functions in a new `lib/marks.ts`, tested like `habit.ts`):

| Mark | Source |
|---|---|
| First ride logged | `store/rides` |
| 100, 500, 1,000, 5,000 km on one bike | rides per bike |
| First night ride | `lib/daylight.ts` against ride start and end |
| First group ride | `store/companion`, group rides |
| First service logged | reminders |
| First fix-it guide finished | `store/fixit` |
| First trail ridden | passport list (`features/passport`) |
| First year on the road (recap exists) | `lib/yearRecap.ts` |

**Unlock moment:** below the ride-end stats or on the screen where the action happened. The stamp lands (scale 1.06 to 1, opacity 0 to 1, `scene`, `arrive`, no bounce, no rotation), one thin ring in `c.accent` expands once and fades (`slow`), `milestone` haptic. One line: "First night ride". It does not block anything and clears itself.
**Log:** a "Marks" section on the You tab, linking to a grid screen; the existing `/passport` page ("Trails ridden") stays as is.
**Persistence:** a local ledger of unlocked ids and the date, so nothing re-celebrates. Sync is not built; when it is, the ledger is the first thing to sync.
**Reduced motion:** the stamp fades in; no ring.

### M6. Group rides
**Where:** `features/group/`, group status in the HUD and the Group sheet.
- A rider joining slides into the list (`base`) with their `c.riders` colour dot; leaving fades.
- Regroup point: a single 600 ms ring pulse on the map when it is set, not a loop.
- **Everyone's home:** as each rider ends or checks in, their row gets a drawn check (`c.good`); when the last arrives the header reads "Everyone's home" with `confirm`. This is the most meaningful safety moment in the app and costs nothing.

### M7. Year recap
**Where:** `app/recap.tsx`. The big figure counts up once per session per year (`useCountUp`, `scene`); highlight bars grow from zero (`slow`, staggered to the cap). The shareable `RecapCard` is a static image and does not animate.

### M8. Compass
Already damped (`Compass.tsx`, `Easing.out(quad)`). Only change: read `turnMs` and the easing from `motion` tokens. No new behaviour; it is used at speed.

### M9. The everyday layer ("wherever it logically applies")
This is where most of the polish is felt. Audit first (S2), then apply.

| Surface | Interaction |
|---|---|
| Every pressable | `ScalePressable` behaviour (exists) with `opacity.pressed`; audit that `Button`, `Chip`, `Row`, `IconButton`, `TabBar` use it. Press in/out `tap` |
| Tab bar | Icon weight and label colour change `quick`; `tick` haptic on switch; the existing sliding indicator keeps its timing from tokens |
| Segmented tabs, choice chips, toggles | `tick` on change |
| `Button` async actions (`useAction`) | Label to spinner to a brief check ("Saved", about 900 ms) and back; `confirm` only for actions that matter (save ride, submit report) |
| Sheets (`Sheet.tsx`) | Rise with `base` and `arrive`; a `tick` as it passes a snap point; dismiss reverses faster (`exit`) |
| Lists on first mount | `Reveal` with `motion.stagger` (40 ms, capped at 240 ms total), first mount per session only, never on tab revisit |
| Loading | Replace "Loading…" text with skeleton rows (`c.card` to `c.raised`, a slow `slow` opacity pulse), shown only after 300 ms so fast loads never flash |
| Empty states | Content first; one short route draw (`RouteArt` seed, `scene`) in `EmptyState`, once |
| Forms (`Field`) | Focus outline grows `tap`; an error message slides in `quick` in `c.stop` with `warn` haptic; no shake |
| Saved / ridden toggles (trail page "I've ridden this") | The state change stamps (the M5 stamp, smaller) and `tick` |
| Numbers that change by user input (unit switch, fuel price) | Crossfade `tap`, not roll |
| Offline and sync badges | State change crossfade; the check draws on success |
| Existing delight (PullBike, PullQuote, engine haptics, Pronunciation) | Untouched, only re-pointed at `motion` tokens |

## 6. Data and logic (all pure, all tested)
- `lib/marks.ts`: `marksFor(rides, bikes, fixit, group, now)` returns the unlocked set with dates; `newMarks(prev, next)` returns what just unlocked. Unit tests with fixtures, the way `habit.test.ts` works.
- `lib/closing.ts`: builds the ride-end sequence input (simplified track, waypoint timings, final figures) so the component is a thin player; tested for gap handling and for the minimum-points fallback.
- `lib/odometer.ts`: per-bike total and the digit plan between two totals (the wrap case, 8 to 12).
- No new network calls, no server tables, nothing counted on a server.

## 7. Delivery phases

| Phase | Contents | Done when |
|---|---|---|
| 0 Spikes | S1: map trace technique on iOS, Android, web. S2: pressable and motion audit. S3: contrast cases for new pairings | S1 picks a technique with a measured frame rate; S2 lists every non-conforming control; S3 tests pass |
| 1 Foundations | Tokens, haptic vocabulary, Feedback switch, hooks, `seen` ledger, gallery screen (section 4) | `check:tokens`, `check:colors`, typecheck, unit tests green; gallery shows stubs |
| 2 Everyday layer | M3 and M9, in that order: checkbox, buttons, tabs, sheets, skeletons, lists | Audit list from S2 is empty; no literal numbers; dark and light screenshots reviewed |
| 3 Ride end | M1 and `lib/closing.ts` | Verified on an iPhone simulator, a physical Android phone, and the web build; reduced-motion path checked |
| 4 Garage | M2 and `lib/odometer.ts` | Odometer and ring verified with seeded data, including a wrap and an overdue reminder |
| 5 Marks | M5, `lib/marks.ts`, the log, unlock moment wired into M1, M2, M4, M6 | All marks unlock from fixtures; no re-celebration after restart |
| 6 Fix it, group, recap | M4, M6, M7, M8 | Each reviewed in the gallery and in its real screen |
| Later | Explored map and "new road" stamp (needs a design: segments come from `lib/heat.ts`); pre-ride check as a feature; mark sync | Separate plan |

Each phase ships on its own and leaves the app better without the next one.

## 8. Verification (per phase)
- Logic: vitest for every pure module above; `contrast.test.ts` for every new pairing.
- Rules: `npm run check:tokens`, `npm run check:colors`, `npm run typecheck`, `npm run lint`.
- Look: iOS Simulator screenshots in light and dark (`xcrun simctl`), at standard and large Dynamic Type; Android on a real device with font scale 1.3.
- Feel: the gallery screen on a physical phone for haptics and frame rate. Simulators prove layout, not feel; the report says which device produced which evidence.
- Accessibility: VoiceOver and TalkBack announce each result; reduced motion (iOS) and "Remove animations" (Android) produce final states with colour changes intact; 48 pt targets unchanged.
- Performance: the trace stays at or above 50 fps on the lowest-end Android phone available, or the fallback technique is used; nothing animates while the app is backgrounded or the screen is blurred.

## 9. Open decisions (need the owner)
- **D1. Name and metaphor:** "Marks" (survey benchmarks, matches the identity) versus "Patches" (rider culture, riskier against "no decorative devices"). Recommendation: Marks.
- **D2. Records:** this plan deliberately has no "longest ride" or speed records, only first times and cumulative totals, so nothing nudges a rider to push past what is wise. Confirm, or say which record you do want.
- **D3. Haptics default:** on, with a Feedback switch. Confirm.
- **D4. Replay button on the ride map:** include (recommended) or drop.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Map trace is janky on weak Android | S1 measures it; the fallback is a short fade of the finished line |
| Motion adds up and feels busy | Principles 2, 4 and 5; the gallery lets us tune the sum, not each piece |
| Token checker rejects animation numbers | They live in `theme/tokens.ts` (exempt); screens only reference names |
| New colour pairings fail contrast in dark | S3 and `contrast.test.ts` before any moment ships |
| Haptics annoy | One vocabulary, rare `milestone`, a switch, never during riding except existing ride actions |

## 11. What was built

Built and checked (`check:tokens`, `check:colors`, `tsc`, vitest all green):

| Plan item | Where |
|---|---|
| Motion tokens | `theme/tokens.ts` (`motion`); `ui/motion.tsx` reads them |
| Haptic vocabulary, Feedback switches, Android patterns, speed ticks | `lib/haptics.ts`, `lib/feedbackPlan.ts`, `store/appearance.ts`, `features/ride/useSpeedTicks.ts`, rows on the You tab |
| Hooks and ledger | `ui/motionHooks.ts` (`useOnce`, `useProgress`, `useCountUp`), `store/seen.ts` |
| M1 Ride end, inked on the real map, counting figures, Replay | `lib/closing.ts`, `ui/RideMap.tsx` (`ink`), `app/story/[id].tsx` |
| M2 Odometer, service rings | `lib/odometer.ts`, `ui/Odometer.tsx`, `ui/ServiceRing.tsx`, `features/TodoRow.tsx`, `app/todos/index.tsx`, `serviceLeft` in `lib/todos.ts` |
| M3 Checkbox draw and tick | `ui/Checkbox.tsx`, `ui/DrawnCheck.tsx` |
| M4 Fix it progress, step ticks, confirm | `features/fixit/parts.tsx`, `app/fixit/[id].tsx` |
| M5 Marks, stamps, log, announcement | `lib/marks.ts`, `store/marks.ts`, `store/markToast.ts`, `lib/markSync.ts`, `ui/Stamp.tsx`, `MarkHost.tsx`, `app/marks.tsx` |
| M7 Recap count-up | `app/recap.tsx` |
| M9 Tick on tabs, segmented tabs and chips; skeleton loading | `ui/TabBar.tsx`, `ui/SegmentedTabs.tsx`, `ui/Chip.tsx`, `ui/Skeleton.tsx` |
| Gallery | `app/dev/motion.tsx`, reachable from the You tab. Plan said dev-only; it is visible so it can be reviewed in a Release build, and should be hidden before a public release |

Added in the second pass:

| Item | Where |
|---|---|
| **M6 Everyone's home** (full stack) | Server: `apps/web/db/migrations/0044_group_ride_home.sql` (a `home_at` moment per member, no position), `markHome` in `server/rides/group-rides.ts`, `POST /group-rides/{id}/home`, riders carry `home`, and a rider who left but said they were home stays on the list. App: `home` in `lib/groupCore.ts` (`homeCount`, `justEveryoneHome`), `tellGroupHome` in `api/groups.ts`, `features/group/TellHome.tsx` and `useTellHome.ts` (on the ride story and under the Dash group card), Home checks and the sage "Everyone's home" card in `LiveGroupCard.tsx`, the announcement and confirm haptic in `CompanionHost.tsx`, and simulated riders who finish the route go home in `lib/groupSim.ts` |
| New ground at ride end | `lib/newGround.ts` (share of a ride on ~100 m cells no earlier ride touched), shown under the ride's distance when at least 1 km |
| Pre-ride check | `app/fixit/check.tsx`: drawn ticks, a large drawn "All clear", confirm haptic when clear, warning haptic when something needs fixing |
| Form errors | `ui/Field.tsx`: the message slides in with a warning haptic |

**Deploying "Everyone's home".** The migration must be applied to the database before the new server code is deployed (the sync query reads `home_at`). Neither has been applied or deployed. An app on an older server still works: it never receives `home`, so no one shows as home. The `*.db.test.ts` cases for it were written but could not be run here (no test database).

Not built, and why:
- **Button "saved" state, sheet snap-point tick, first-mount list stagger audit, Compass tokens**: left as they were; none changes what a rider sees on the main path.
- **Spike S1 (map trace technique).** The fallback was built directly (slicing a simplified track about 30 times a second) and the native `line-trim-offset` path was not tried. Frame rate on a low-end Android phone is unmeasured.
- **Contrast cases** for new pairings are covered by the existing per-text-tone tests (ink, accent, good, caution, stop on every surface); no new pairing was introduced.
- **Explored (fog) map, mark sync**: still "Later". Pre-ride check as an arming feature: the existing check got the moments instead.
